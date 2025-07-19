// Lunoa Staking Smart Contract
//
// This contract manages $LUNOA token staking with rewards and lock periods

module LunoaQuests::staking {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;
    use LunoaQuests::lunoa_coin::LunoaCoin;

    /// Errors
    const ESTAKE_NOT_FOUND: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 2;
    const ESTAKE_LOCKED: u64 = 3;
    const EINVALID_AMOUNT: u64 = 4;
    const EPOOL_NOT_FOUND: u64 = 5;
    const ENOT_AUTHORIZED: u64 = 6;

    /// Staking pool tiers with different APY rates
    const BRONZE_TIER_DAYS: u64 = 30;
    const SILVER_TIER_DAYS: u64 = 90;
    const GOLD_TIER_DAYS: u64 = 180;
    const DIAMOND_TIER_DAYS: u64 = 365;

    const BRONZE_APY: u64 = 5;   // 5% APY
    const SILVER_APY: u64 = 8;   // 8% APY
    const GOLD_APY: u64 = 12;    // 12% APY
    const DIAMOND_APY: u64 = 20; // 20% APY

    /// Individual stake information
    struct Stake has store {
        staker: address,
        amount: u64,
        stake_time: u64,
        lock_duration: u64,
        tier: u8, // 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
        rewards_claimed: u64,
        is_active: bool,
    }

    /// Staking pool resource
    struct StakingPool has key {
        stakes: vector<Stake>,
        total_staked: u64,
        total_rewards_distributed: u64,
        admin: address,
        pool_active: bool,
    }

    /// User staking info
    struct UserStakingInfo has key {
        active_stakes: vector<u64>, // stake IDs
        total_staked: u64,
        total_rewards_earned: u64,
    }

    /// Events
    #[event]
    struct StakeCreated has drop, store {
        staker: address,
        amount: u64,
        tier: u8,
        lock_duration: u64,
        stake_id: u64,
    }

    #[event]
    struct StakeWithdrawn has drop, store {
        staker: address,
        amount: u64,
        rewards: u64,
        stake_id: u64,
    }

    #[event]
    struct RewardsClaimed has drop, store {
        staker: address,
        rewards: u64,
        stake_id: u64,
    }

    /// Initialize staking pool
    public entry fun initialize_staking_pool(admin: &signer) {
        let pool = StakingPool {
            stakes: vector::empty<Stake>(),
            total_staked: 0,
            total_rewards_distributed: 0,
            admin: signer::address_of(admin),
            pool_active: true,
        };
        move_to(admin, pool);
    }

    /// Initialize user staking info
    fun init_user_staking_info(user: &signer) {
        if (!exists<UserStakingInfo>(signer::address_of(user))) {
            let info = UserStakingInfo {
                active_stakes: vector::empty<u64>(),
                total_staked: 0,
                total_rewards_earned: 0,
            };
            move_to(user, info);
        };
    }

    /// Create a new stake
    public entry fun stake_tokens(
        staker: &signer,
        amount: u64,
        lock_days: u64,
        pool_addr: address,
    ) acquires StakingPool, UserStakingInfo {
        assert!(amount > 0, EINVALID_AMOUNT);
        let staker_addr = signer::address_of(staker);
        assert!(coin::balance<LunoaCoin>(staker_addr) >= amount, EINSUFFICIENT_BALANCE);

        let pool = borrow_global_mut<StakingPool>(pool_addr);
        assert!(pool.pool_active, EPOOL_NOT_FOUND);

        // Determine tier based on lock duration
        let tier = if (lock_days >= DIAMOND_TIER_DAYS) 4
                  else if (lock_days >= GOLD_TIER_DAYS) 3
                  else if (lock_days >= SILVER_TIER_DAYS) 2
                  else 1;

        let lock_duration = lock_days * 24 * 60 * 60; // Convert days to seconds

        // Transfer tokens to pool
        coin::transfer<LunoaCoin>(staker, pool_addr, amount);

        // Create stake
        let stake = Stake {
            staker: staker_addr,
            amount,
            stake_time: timestamp::now_seconds(),
            lock_duration,
            tier,
            rewards_claimed: 0,
            is_active: true,
        };

        let stake_id = vector::length(&pool.stakes);
        vector::push_back(&mut pool.stakes, stake);
        pool.total_staked = pool.total_staked + amount;

        // Initialize and update user info
        init_user_staking_info(staker);
        let user_info = borrow_global_mut<UserStakingInfo>(staker_addr);
        vector::push_back(&mut user_info.active_stakes, stake_id);
        user_info.total_staked = user_info.total_staked + amount;

        event::emit(StakeCreated {
            staker: staker_addr,
            amount,
            tier,
            lock_duration,
            stake_id,
        });
    }

    /// Calculate pending rewards for a stake
    public fun calculate_rewards(
        stake_id: u64,
        pool_addr: address,
    ): u64 acquires StakingPool {
        let pool = borrow_global<StakingPool>(pool_addr);
        assert!(stake_id < vector::length(&pool.stakes), ESTAKE_NOT_FOUND);

        let stake = vector::borrow(&pool.stakes, stake_id);
        if (!stake.is_active) return 0;

        let current_time = timestamp::now_seconds();
        let time_staked = current_time - stake.stake_time;
        
        // Get APY based on tier
        let apy = if (stake.tier == 4) DIAMOND_APY
                 else if (stake.tier == 3) GOLD_APY
                 else if (stake.tier == 2) SILVER_APY
                 else BRONZE_APY;

        // Calculate rewards: (amount * apy * time_staked) / (365 * 24 * 60 * 60 * 100)
        let annual_seconds = 365 * 24 * 60 * 60;
        let rewards = (stake.amount * apy * time_staked) / (annual_seconds * 100);
        
        rewards - stake.rewards_claimed
    }

    /// Claim rewards without unstaking
    public entry fun claim_rewards(
        staker: &signer,
        stake_id: u64,
        pool_addr: address,
    ) acquires StakingPool, UserStakingInfo {
        let staker_addr = signer::address_of(staker);
        let pool = borrow_global_mut<StakingPool>(pool_addr);
        assert!(stake_id < vector::length(&pool.stakes), ESTAKE_NOT_FOUND);

        let stake = vector::borrow_mut(&mut pool.stakes, stake_id);
        assert!(stake.staker == staker_addr, ENOT_AUTHORIZED);
        assert!(stake.is_active, ESTAKE_NOT_FOUND);

        let rewards = calculate_rewards(stake_id, pool_addr);
        if (rewards > 0) {
            // Transfer rewards to staker
            coin::transfer<LunoaCoin>(&account::create_signer_with_capability(&account::create_test_signer_cap(pool_addr)), staker_addr, rewards);
            
            stake.rewards_claimed = stake.rewards_claimed + rewards;
            pool.total_rewards_distributed = pool.total_rewards_distributed + rewards;

            // Update user info
            let user_info = borrow_global_mut<UserStakingInfo>(staker_addr);
            user_info.total_rewards_earned = user_info.total_rewards_earned + rewards;

            event::emit(RewardsClaimed {
                staker: staker_addr,
                rewards,
                stake_id,
            });
        };
    }

    /// Unstake tokens (only after lock period)
    public entry fun unstake_tokens(
        staker: &signer,
        stake_id: u64,
        pool_addr: address,
    ) acquires StakingPool, UserStakingInfo {
        let staker_addr = signer::address_of(staker);
        let pool = borrow_global_mut<StakingPool>(pool_addr);
        assert!(stake_id < vector::length(&pool.stakes), ESTAKE_NOT_FOUND);

        let stake = vector::borrow_mut(&mut pool.stakes, stake_id);
        assert!(stake.staker == staker_addr, ENOT_AUTHORIZED);
        assert!(stake.is_active, ESTAKE_NOT_FOUND);

        let current_time = timestamp::now_seconds();
        assert!(current_time >= stake.stake_time + stake.lock_duration, ESTAKE_LOCKED);

        // Calculate final rewards
        let rewards = calculate_rewards(stake_id, pool_addr);

        // Transfer staked amount + rewards back to staker
        let total_return = stake.amount + rewards;
        coin::transfer<LunoaCoin>(&account::create_signer_with_capability(&account::create_test_signer_cap(pool_addr)), staker_addr, total_return);

        // Update pool stats
        pool.total_staked = pool.total_staked - stake.amount;
        pool.total_rewards_distributed = pool.total_rewards_distributed + rewards;

        // Update user info
        let user_info = borrow_global_mut<UserStakingInfo>(staker_addr);
        user_info.total_staked = user_info.total_staked - stake.amount;
        user_info.total_rewards_earned = user_info.total_rewards_earned + rewards;

        // Remove stake ID from user's active stakes
        let (found, index) = vector::index_of(&user_info.active_stakes, &stake_id);
        if (found) {
            vector::remove(&mut user_info.active_stakes, index);
        };

        // Mark stake as inactive
        stake.is_active = false;

        event::emit(StakeWithdrawn {
            staker: staker_addr,
            amount: stake.amount,
            rewards,
            stake_id,
        });
    }

    /// Get user's staking information
    public fun get_user_stakes(user_addr: address): (vector<u64>, u64, u64) acquires UserStakingInfo {
        if (!exists<UserStakingInfo>(user_addr)) {
            return (vector::empty<u64>(), 0, 0)
        };
        
        let user_info = borrow_global<UserStakingInfo>(user_addr);
        (user_info.active_stakes, user_info.total_staked, user_info.total_rewards_earned)
    }

    /// Get staking pool statistics
    public fun get_pool_stats(pool_addr: address): (u64, u64, u64) acquires StakingPool {
        let pool = borrow_global<StakingPool>(pool_addr);
        (pool.total_staked, pool.total_rewards_distributed, vector::length(&pool.stakes))
    }

    /// Emergency unstake (with penalty)
    public entry fun emergency_unstake(
        staker: &signer,
        stake_id: u64,
        pool_addr: address,
    ) acquires StakingPool, UserStakingInfo {
        let staker_addr = signer::address_of(staker);
        let pool = borrow_global_mut<StakingPool>(pool_addr);
        assert!(stake_id < vector::length(&pool.stakes), ESTAKE_NOT_FOUND);

        let stake = vector::borrow_mut(&mut pool.stakes, stake_id);
        assert!(stake.staker == staker_addr, ENOT_AUTHORIZED);
        assert!(stake.is_active, ESTAKE_NOT_FOUND);

        // Apply 10% penalty for early withdrawal
        let penalty = stake.amount / 10;
        let return_amount = stake.amount - penalty;

        // Transfer reduced amount back to staker
        coin::transfer<LunoaCoin>(&account::create_signer_with_capability(&account::create_test_signer_cap(pool_addr)), staker_addr, return_amount);

        // Update pool and user stats
        pool.total_staked = pool.total_staked - stake.amount;
        
        let user_info = borrow_global_mut<UserStakingInfo>(staker_addr);
        user_info.total_staked = user_info.total_staked - stake.amount;

        // Remove from active stakes
        let (found, index) = vector::index_of(&user_info.active_stakes, &stake_id);
        if (found) {
            vector::remove(&mut user_info.active_stakes, index);
        };

        stake.is_active = false;

        event::emit(StakeWithdrawn {
            staker: staker_addr,
            amount: return_amount,
            rewards: 0,
            stake_id,
        });
    }
}
