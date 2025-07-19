// Lunoa Governance Smart Contract
//
// This contract manages governance proposals and voting for $LUNOA token holders

module LunoaQuests::governance {
    use std::string::String;
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use LunoaQuests::lunoa_coin::LunoaCoin;

    /// Errors
    const EPROPOSAL_NOT_FOUND: u64 = 1;
    const EINSUFFICIENT_VOTING_POWER: u64 = 2;
    const EVOTING_ENDED: u64 = 3;
    const EALREADY_VOTED: u64 = 4;
    const EPROPOSAL_NOT_ACTIVE: u64 = 5;
    const ENOT_AUTHORIZED: u64 = 6;
    const EINVALID_PROPOSAL: u64 = 7;

    /// Proposal types
    const PROPOSAL_TYPE_PARAMETER: u8 = 1;
    const PROPOSAL_TYPE_UPGRADE: u8 = 2;
    const PROPOSAL_TYPE_TREASURY: u8 = 3;
    const PROPOSAL_TYPE_GENERAL: u8 = 4;

    /// Proposal status
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_PASSED: u8 = 2;
    const STATUS_REJECTED: u8 = 3;
    const STATUS_EXECUTED: u8 = 4;

    /// Minimum voting power required to create proposals
    const MIN_PROPOSAL_THRESHOLD: u64 = 1000000; // 1M LUNOA tokens

    /// Vote structure
    struct Vote has store {
        voter: address,
        voting_power: u64,
        support: bool, // true = yes, false = no
        timestamp: u64,
    }

    /// Governance proposal
    struct Proposal has store {
        id: u64,
        proposer: address,
        title: String,
        description: String,
        proposal_type: u8,
        voting_start: u64,
        voting_end: u64,
        votes_for: u64,
        votes_against: u64,
        total_votes: u64,
        status: u8,
        execution_payload: vector<u8>, // For future upgrades
        votes: vector<Vote>,
    }

    /// Governance DAO structure
    struct GovernanceDAO has key {
        proposals: vector<Proposal>,
        total_proposals: u64,
        admin: address,
        voting_duration: u64, // in seconds
        quorum_threshold: u64, // minimum votes needed
        pass_threshold: u64, // percentage needed to pass (out of 100)
    }

    /// User voting record
    struct VotingRecord has key {
        voted_proposals: vector<u64>,
        total_voting_power_used: u64,
        proposals_created: u64,
    }

    /// Events
    #[event]
    struct ProposalCreated has drop, store {
        proposal_id: u64,
        proposer: address,
        title: String,
        proposal_type: u8,
        voting_end: u64,
    }

    #[event]
    struct VoteCast has drop, store {
        proposal_id: u64,
        voter: address,
        voting_power: u64,
        support: bool,
    }

    #[event]
    struct ProposalExecuted has drop, store {
        proposal_id: u64,
        status: u8,
        votes_for: u64,
        votes_against: u64,
    }

    /// Initialize governance DAO
    public entry fun initialize_governance(
        admin: &signer,
        voting_duration: u64,
        quorum_threshold: u64,
        pass_threshold: u64,
    ) {
        let dao = GovernanceDAO {
            proposals: vector::empty<Proposal>(),
            total_proposals: 0,
            admin: signer::address_of(admin),
            voting_duration,
            quorum_threshold,
            pass_threshold,
        };
        move_to(admin, dao);
    }

    /// Initialize user voting record
    fun init_voting_record(user: &signer) {
        if (!exists<VotingRecord>(signer::address_of(user))) {
            let record = VotingRecord {
                voted_proposals: vector::empty<u64>(),
                total_voting_power_used: 0,
                proposals_created: 0,
            };
            move_to(user, record);
        };
    }

    /// Get voting power based on token balance
    public fun get_voting_power(user_addr: address): u64 {
        coin::balance<LunoaCoin>(user_addr)
    }

    /// Create a new governance proposal
    public entry fun create_proposal(
        proposer: &signer,
        title: String,
        description: String,
        proposal_type: u8,
        dao_addr: address,
    ) acquires GovernanceDAO, VotingRecord {
        let proposer_addr = signer::address_of(proposer);
        let voting_power = get_voting_power(proposer_addr);
        assert!(voting_power >= MIN_PROPOSAL_THRESHOLD, EINSUFFICIENT_VOTING_POWER);

        let dao = borrow_global_mut<GovernanceDAO>(dao_addr);
        let current_time = timestamp::now_seconds();
        
        let proposal = Proposal {
            id: dao.total_proposals,
            proposer: proposer_addr,
            title,
            description,
            proposal_type,
            voting_start: current_time,
            voting_end: current_time + dao.voting_duration,
            votes_for: 0,
            votes_against: 0,
            total_votes: 0,
            status: STATUS_ACTIVE,
            execution_payload: vector::empty<u8>(),
            votes: vector::empty<Vote>(),
        };

        vector::push_back(&mut dao.proposals, proposal);
        dao.total_proposals = dao.total_proposals + 1;

        // Update proposer's record
        init_voting_record(proposer);
        let record = borrow_global_mut<VotingRecord>(proposer_addr);
        record.proposals_created = record.proposals_created + 1;

        event::emit(ProposalCreated {
            proposal_id: dao.total_proposals - 1,
            proposer: proposer_addr,
            title,
            proposal_type,
            voting_end: current_time + dao.voting_duration,
        });
    }

    /// Cast a vote on a proposal
    public entry fun vote(
        voter: &signer,
        proposal_id: u64,
        support: bool,
        dao_addr: address,
    ) acquires GovernanceDAO, VotingRecord {
        let voter_addr = signer::address_of(voter);
        let voting_power = get_voting_power(voter_addr);
        assert!(voting_power > 0, EINSUFFICIENT_VOTING_POWER);

        let dao = borrow_global_mut<GovernanceDAO>(dao_addr);
        assert!(proposal_id < vector::length(&dao.proposals), EPROPOSAL_NOT_FOUND);

        let proposal = vector::borrow_mut(&mut dao.proposals, proposal_id);
        assert!(proposal.status == STATUS_ACTIVE, EPROPOSAL_NOT_ACTIVE);
        assert!(timestamp::now_seconds() <= proposal.voting_end, EVOTING_ENDED);

        // Check if user already voted
        let i = 0;
        let votes_len = vector::length(&proposal.votes);
        while (i < votes_len) {
            let vote = vector::borrow(&proposal.votes, i);
            assert!(vote.voter != voter_addr, EALREADY_VOTED);
            i = i + 1;
        };

        // Create and add vote
        let vote = Vote {
            voter: voter_addr,
            voting_power,
            support,
            timestamp: timestamp::now_seconds(),
        };

        vector::push_back(&mut proposal.votes, vote);

        // Update vote counts
        if (support) {
            proposal.votes_for = proposal.votes_for + voting_power;
        } else {
            proposal.votes_against = proposal.votes_against + voting_power;
        };
        proposal.total_votes = proposal.total_votes + voting_power;

        // Update voter's record
        init_voting_record(voter);
        let record = borrow_global_mut<VotingRecord>(voter_addr);
        vector::push_back(&mut record.voted_proposals, proposal_id);
        record.total_voting_power_used = record.total_voting_power_used + voting_power;

        event::emit(VoteCast {
            proposal_id,
            voter: voter_addr,
            voting_power,
            support,
        });
    }

    /// Execute a proposal after voting ends
    public entry fun execute_proposal(
        executor: &signer,
        proposal_id: u64,
        dao_addr: address,
    ) acquires GovernanceDAO {
        let dao = borrow_global_mut<GovernanceDAO>(dao_addr);
        assert!(proposal_id < vector::length(&dao.proposals), EPROPOSAL_NOT_FOUND);

        let proposal = vector::borrow_mut(&mut dao.proposals, proposal_id);
        assert!(proposal.status == STATUS_ACTIVE, EPROPOSAL_NOT_ACTIVE);
        assert!(timestamp::now_seconds() > proposal.voting_end, EVOTING_ENDED);

        // Check if quorum is met
        let quorum_met = proposal.total_votes >= dao.quorum_threshold;
        
        // Check if proposal passes
        let pass_percentage = if (proposal.total_votes > 0) {
            (proposal.votes_for * 100) / proposal.total_votes
        } else {
            0
        };

        let proposal_passed = quorum_met && pass_percentage >= dao.pass_threshold;

        // Update proposal status
        proposal.status = if (proposal_passed) STATUS_PASSED else STATUS_REJECTED;

        // If passed, mark as executed (actual execution logic would go here)
        if (proposal_passed) {
            proposal.status = STATUS_EXECUTED;
        };

        event::emit(ProposalExecuted {
            proposal_id,
            status: proposal.status,
            votes_for: proposal.votes_for,
            votes_against: proposal.votes_against,
        });
    }

    /// Get proposal details
    public fun get_proposal(
        proposal_id: u64,
        dao_addr: address,
    ): (address, String, String, u8, u64, u64, u64, u64, u8) acquires GovernanceDAO {
        let dao = borrow_global<GovernanceDAO>(dao_addr);
        assert!(proposal_id < vector::length(&dao.proposals), EPROPOSAL_NOT_FOUND);

        let proposal = vector::borrow(&dao.proposals, proposal_id);
        (
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.proposal_type,
            proposal.voting_end,
            proposal.votes_for,
            proposal.votes_against,
            proposal.total_votes,
            proposal.status
        )
    }

    /// Get DAO statistics
    public fun get_dao_stats(dao_addr: address): (u64, u64, u64, u64) acquires GovernanceDAO {
        let dao = borrow_global<GovernanceDAO>(dao_addr);
        (dao.total_proposals, dao.voting_duration, dao.quorum_threshold, dao.pass_threshold)
    }

    /// Get user's voting record
    public fun get_voting_record(user_addr: address): (vector<u64>, u64, u64) acquires VotingRecord {
        if (!exists<VotingRecord>(user_addr)) {
            return (vector::empty<u64>(), 0, 0)
        };
        
        let record = borrow_global<VotingRecord>(user_addr);
        (record.voted_proposals, record.total_voting_power_used, record.proposals_created)
    }

    /// Get active proposals count
    public fun get_active_proposals_count(dao_addr: address): u64 acquires GovernanceDAO {
        let dao = borrow_global<GovernanceDAO>(dao_addr);
        let count = 0;
        let i = 0;
        let len = vector::length(&dao.proposals);
        
        while (i < len) {
            let proposal = vector::borrow(&dao.proposals, i);
            if (proposal.status == STATUS_ACTIVE && timestamp::now_seconds() <= proposal.voting_end) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }

    /// Update DAO parameters (admin only)
    public entry fun update_dao_parameters(
        admin: &signer,
        new_voting_duration: u64,
        new_quorum_threshold: u64,
        new_pass_threshold: u64,
        dao_addr: address,
    ) acquires GovernanceDAO {
        let dao = borrow_global_mut<GovernanceDAO>(dao_addr);
        assert!(signer::address_of(admin) == dao.admin, ENOT_AUTHORIZED);

        dao.voting_duration = new_voting_duration;
        dao.quorum_threshold = new_quorum_threshold;
        dao.pass_threshold = new_pass_threshold;
    }
}
