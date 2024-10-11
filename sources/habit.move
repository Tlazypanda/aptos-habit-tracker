module deployer_address::habit_trackerv1{

    use std::string::String;
    use aptos_framework::event;
    use std::vector;
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_framework::aptos_coin::{Self, AptosCoin};

   
    struct Pool has key, store{
        coins: Coin<AptosCoin>,
        unlock_time: u64,
    }

    #[resource_group_member(group= aptos_framework::object::ObjectGroup)]
    struct Task has key {
        name: String,
        description: String,
        pool: Pool,
        ticket_price_in_octa: u64,
        invite_only: bool,
        allowlisted_participants: vector<address>,
        participants: vector<address>,
        submissions: vector<TaskSubmission>,
        winner_counter: u64
    }

    struct TaskSubmission has key, store{
       id: u64,
       link: String,
       upvotes: u64,
       upvoted_addresses: vector<address>,
       eligible_for_pool: bool,
       creator: address 
    }

    const EALREADY_VOTED: u64 = 0;
    const EFUNDING_PERIOD_NOT_OVER: u64 = 1;
    const EFUNDING_PERIOD_OVER: u64 = 2;
    const ENOT_ALLOWLISTED: u64 = 3;
    const ETASK_NOT_FOUND: u64 = 4;
    const ECANT_VOTE_FOR_SELF: u64 = 5;
    const ENOT_A_PARTICIPANT: u64 = 6;

    public entry fun create_task(creator: &signer, lock_dur_secs: u64, ticket_price_in_octa: u64, invite_only: bool, participants: vector<address>, name: String, description: String, allowlisted_participants: vector<address>){

        let coins = coin::withdraw<AptosCoin>(creator, ticket_price_in_octa);
        let unlock_time = timestamp::now_seconds() + lock_dur_secs;

        let pool = Pool{coins: coins, unlock_time: unlock_time};
        vector::push_back(&mut participants, signer::address_of(creator));
        move_to(creator, Task{name: name, ticket_price_in_octa: ticket_price_in_octa, winner_counter:0, description: description, participants: participants, allowlisted_participants: allowlisted_participants, pool: pool, invite_only: invite_only, submissions: vector::empty()});
    }


    public entry fun buy_ticket(participant: &signer, task_obj: address) acquires Task{
        let task = borrow_global_mut<Task>(task_obj);

        assert!(timestamp::now_seconds()< task.pool.unlock_time, EFUNDING_PERIOD_OVER);
        if(task.invite_only)
        {
            assert!(vector::contains(&task.allowlisted_participants , &signer::address_of(participant)), ENOT_ALLOWLISTED);
        };

        let coins = coin::withdraw<AptosCoin>(participant, task.ticket_price_in_octa);

        coin::merge(&mut task.pool.coins, coins);
        vector::push_back(&mut task.participants, signer::address_of(participant));
    }

    public entry fun submit_task(participant: &signer, task_obj: address, link: String) acquires Task{
        let task = borrow_global_mut<Task>(task_obj);
        assert!(timestamp::now_seconds()< task.pool.unlock_time, EFUNDING_PERIOD_OVER);
        
        let participant_addr = signer::address_of(participant);
        assert!(vector::contains(&task.participants, &participant_addr), ENOT_A_PARTICIPANT);

        let total_submissions_length = vector::length(&task.submissions);
        let submission_id = total_submissions_length + 1;
        let submission = TaskSubmission{id: submission_id, link: link, creator:participant_addr, upvotes: 0, eligible_for_pool: false, upvoted_addresses: vector::empty()};
        vector::push_back(&mut task.submissions, submission);
    }

    public entry fun upvote_submission(participant: &signer, submission_id: u64, task_obj: address) acquires Task{
        let task = borrow_global_mut<Task>(task_obj);

        assert!(timestamp::now_seconds()< task.pool.unlock_time, EFUNDING_PERIOD_OVER);
        
        let participant_addr = signer::address_of(participant);
        let total_participant_length = vector::length(&task.submissions);

     
        let submission = vector::borrow_mut(&mut task.submissions, submission_id - 1);
        assert!(submission.creator != participant_addr, ECANT_VOTE_FOR_SELF);

        assert!(!vector::contains(&submission.upvoted_addresses, &participant_addr), EALREADY_VOTED);

        let upvotes = &mut submission.upvotes;
        *upvotes = *upvotes + 1;
        let min_accepted_votes = total_participant_length * 8/10;
        if(*upvotes > min_accepted_votes){
            submission.eligible_for_pool = true;
            task.winner_counter = task.winner_counter + 1;
        };
        vector::push_back(&mut submission.upvoted_addresses, participant_addr);
    }

    public entry fun distribute_funds(creator: &signer) acquires Task{
        let creator_addr = signer::address_of(creator);
        assert!(exists<Task>(creator_addr), ETASK_NOT_FOUND);
        let task = borrow_global_mut<Task>(creator_addr);
        assert!(timestamp::now_seconds()> task.pool.unlock_time, EFUNDING_PERIOD_NOT_OVER);
        
        let coin_val = coin::value<AptosCoin>(&task.pool.coins);
        let coin_share = coin_val/task.winner_counter;
        let total_submission_length = vector::length(&task.submissions);
        
        let i = 0;
        while (i < total_submission_length){
            let submission = vector::borrow(&task.submissions, i);
            if(submission.eligible_for_pool == true){
                let withdrawn_coin = coin::extract<AptosCoin>(&mut task.pool.coins, coin_share);
                coin::deposit(submission.creator, withdrawn_coin);
            };
            i = i+1;

        }
    }


}