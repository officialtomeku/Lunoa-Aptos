// Lunoa NFT Marketplace Smart Contract
//
// This contract manages NFT trading, including listing, buying, and royalty distribution

module LunoaQuests::nft_marketplace {
    use std::string::String;
    use std::signer;
    use std::vector;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_token_objects::token;
    use LunoaQuests::lunoa_coin::LunoaCoin;
    use LunoaQuests::vibe_nft::VibeNft;

    /// Errors
    const ELISTING_NOT_FOUND: u64 = 1;
    const EINSUFFICIENT_PAYMENT: u64 = 2;
    const ENOT_OWNER: u64 = 3;
    const ELISTING_EXPIRED: u64 = 4;
    const EINVALID_PRICE: u64 = 5;

    /// NFT Listing structure
    struct Listing has key, store {
        seller: address,
        token_object: Object<VibeNft>,
        price: u64,
        royalty_percentage: u8, // 0-100
        expiration_time: u64,
        is_active: bool,
    }

    /// Marketplace resource to store all listings
    struct Marketplace has key {
        listings: vector<Listing>,
        total_volume: u64,
        total_sales: u64,
    }

    /// Events
    #[event]
    struct ListingCreated has drop, store {
        seller: address,
        token_object: Object<VibeNft>,
        price: u64,
        listing_id: u64,
    }

    #[event]
    struct NFTSold has drop, store {
        seller: address,
        buyer: address,
        token_object: Object<VibeNft>,
        price: u64,
        royalty_paid: u64,
    }

    #[event]
    struct ListingCancelled has drop, store {
        seller: address,
        token_object: Object<VibeNft>,
        listing_id: u64,
    }

    /// Initialize the marketplace
    public entry fun initialize_marketplace(admin: &signer) {
        let marketplace = Marketplace {
            listings: vector::empty<Listing>(),
            total_volume: 0,
            total_sales: 0,
        };
        move_to(admin, marketplace);
    }

    /// List an NFT for sale
    public entry fun list_nft(
        seller: &signer,
        token_object: Object<VibeNft>,
        price: u64,
        royalty_percentage: u8,
        duration_seconds: u64,
        marketplace_addr: address,
    ) acquires Marketplace {
        assert!(price > 0, EINVALID_PRICE);
        assert!(object::is_owner(token_object, signer::address_of(seller)), ENOT_OWNER);

        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
        let expiration_time = timestamp::now_seconds() + duration_seconds;

        let listing = Listing {
            seller: signer::address_of(seller),
            token_object,
            price,
            royalty_percentage,
            expiration_time,
            is_active: true,
        };

        let listing_id = vector::length(&marketplace.listings);
        vector::push_back(&mut marketplace.listings, listing);

        // Transfer NFT to marketplace for escrow
        object::transfer(seller, token_object, marketplace_addr);

        event::emit(ListingCreated {
            seller: signer::address_of(seller),
            token_object,
            price,
            listing_id,
        });
    }

    /// Buy an NFT from the marketplace
    public entry fun buy_nft(
        buyer: &signer,
        listing_id: u64,
        marketplace_addr: address,
    ) acquires Marketplace {
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
        assert!(listing_id < vector::length(&marketplace.listings), ELISTING_NOT_FOUND);

        let listing = vector::borrow_mut(&mut marketplace.listings, listing_id);
        assert!(listing.is_active, ELISTING_NOT_FOUND);
        assert!(timestamp::now_seconds() <= listing.expiration_time, ELISTING_EXPIRED);

        let buyer_addr = signer::address_of(buyer);
        let payment = listing.price;

        // Check buyer has sufficient funds
        assert!(coin::balance<LunoaCoin>(buyer_addr) >= payment, EINSUFFICIENT_PAYMENT);

        // Calculate royalty
        let royalty_amount = (payment * (listing.royalty_percentage as u64)) / 100;
        let seller_amount = payment - royalty_amount;

        // Transfer payment
        coin::transfer<LunoaCoin>(buyer, listing.seller, seller_amount);
        
        // Pay royalty to original creator (simplified - in practice, track original creator)
        if (royalty_amount > 0) {
            coin::transfer<LunoaCoin>(buyer, listing.seller, royalty_amount);
        };

        // Transfer NFT to buyer
        object::transfer_raw(&signer::create_signer_with_capability(&object::generate_signer_capability(&listing.token_object)), listing.token_object, buyer_addr);

        // Update marketplace stats
        marketplace.total_volume = marketplace.total_volume + payment;
        marketplace.total_sales = marketplace.total_sales + 1;

        // Mark listing as inactive
        listing.is_active = false;

        event::emit(NFTSold {
            seller: listing.seller,
            buyer: buyer_addr,
            token_object: listing.token_object,
            price: payment,
            royalty_paid: royalty_amount,
        });
    }

    /// Cancel a listing
    public entry fun cancel_listing(
        seller: &signer,
        listing_id: u64,
        marketplace_addr: address,
    ) acquires Marketplace {
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
        assert!(listing_id < vector::length(&marketplace.listings), ELISTING_NOT_FOUND);

        let listing = vector::borrow_mut(&mut marketplace.listings, listing_id);
        assert!(listing.seller == signer::address_of(seller), ENOT_OWNER);
        assert!(listing.is_active, ELISTING_NOT_FOUND);

        // Return NFT to seller
        object::transfer_raw(&signer::create_signer_with_capability(&object::generate_signer_capability(&listing.token_object)), listing.token_object, listing.seller);

        // Mark listing as inactive
        listing.is_active = false;

        event::emit(ListingCancelled {
            seller: listing.seller,
            token_object: listing.token_object,
            listing_id,
        });
    }

    /// Get marketplace statistics
    public fun get_marketplace_stats(marketplace_addr: address): (u64, u64) acquires Marketplace {
        let marketplace = borrow_global<Marketplace>(marketplace_addr);
        (marketplace.total_volume, marketplace.total_sales)
    }

    /// Get active listings count
    public fun get_active_listings_count(marketplace_addr: address): u64 acquires Marketplace {
        let marketplace = borrow_global<Marketplace>(marketplace_addr);
        let count = 0;
        let i = 0;
        let len = vector::length(&marketplace.listings);
        
        while (i < len) {
            let listing = vector::borrow(&marketplace.listings, i);
            if (listing.is_active && timestamp::now_seconds() <= listing.expiration_time) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }
}
