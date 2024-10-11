'use client'

import React, { useState, useEffect } from 'react'
import { ConfigProvider, Layout, Typography, Button, Card, Modal, Form, Input, Radio, Space, Avatar, Progress, Statistic, notification, Menu } from 'antd'
import { PlusOutlined, ThunderboltOutlined, TrophyOutlined, UploadOutlined, FireOutlined, TeamOutlined } from '@ant-design/icons'
import PhotoUpload from './photo-upload'
import GoalCard from './goal-card'
import LeaderboardModal from './leaderboard-modal'
import { Aptos, AptosConfig, Network} from "@aptos-labs/ts-sdk";
import { useWallet} from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

const moduleAddress = "0xb4c500b5a0beba1a70f41a2479c86e7d611bfaa381403d00971cef13040fb3d3";

export default function Dashboard() {
  const [initialGoals, setInitialGoals] = useState([])
  const [goals, setGoals] = useState(initialGoals)
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false)
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [currentGoal, setCurrentGoal] = useState(null)
  const [form] = Form.useForm()
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [totalPrizePool, setTotalPrizePool] = useState(0)
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  const {
    connect,
    account,
    network,
    connected,
    disconnect,
    wallet,
    wallets,
    signAndSubmitTransaction,
    signAndSubmitBCSTransaction,
    signTransaction,
    signMessage,
    signMessageAndVerify,
  } = useWallet();

  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const onConnect = async (walletName) => {
    await connect(walletName);
  };

  useEffect(() => {
    fetchInitialGoals()},[goals]
)

  useEffect(() => {
    const timer = setInterval(() => {
      setGoals(prevGoals => 
        prevGoals.map(goal => ({
          ...goal,
          isEnded: new Date() > goal.endDate
        }))
      )
    }, 1000) // Check every second

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const participants = goals.reduce((sum, goal) => sum + goal.participants, 0)
    const prizePool = goals.reduce((sum, goal) => sum + (goal.entryFee * goal.participants), 0)
    setTotalParticipants(participants)
    setTotalPrizePool(prizePool)
  }, [goals])

  // Mock data for goals
const fetchInitialGoals = async() => {

  try {
    const taskResource = await aptos.getAccountResource(
      {
        accountAddress:account?.address,
        resourceType:`${moduleAddress}::habit_trackerv1::Task`
      }
    );
    console.log(taskResource);

    let winners = [];

    taskResource.submissions.map(sub => 
      {
      if(sub.eligible_for_pool)
        {
          winners.push(sub.creator);
        }
    })
    let goal = {
      id: 0,
      name: taskResource.name,
      description: taskResource.description,
      timeperiod: taskResource.pool.unlock_time,
      participants: taskResource.participants.length,
      entryFee: taskResource.ticket_price_in_octa,
      isParticipating: taskResource.participants.includes(account?.address),
      isCompleted: taskResource.submissions.some(el => el.creator === account?.address),
      submissions: taskResource.submissions,
      endDate: taskResource.pool.unlock_time,
      winner_counter: taskResource.winner_counter,
      winners: winners,
      total_funds: taskResource.pool.coins.value,
      per_winner_amt: taskResource.participants.length*taskResource.ticket_price_in_octa/taskResource.winner_counter,
      isEnded: new Date().getTime() > taskResource.pool.unlock_time
    }
    setGoals([goal]);
    
  } catch (e) {
    console.log(e);
  }
}

  const handleCreateGoal = async(values) => {
    const goal = {
      id: goals.length + 1,
      ...values,
      participants: 0,
      isParticipating: false,
      isCompleted: false,
      submissions: [],
      endDate: new Date(Date.now() + getTimeInMilliseconds(values.timeperiod)),
      winners: []
    }
    setGoals([...goals, goal])
    setIsCreateGoalOpen(false)

    if (!account) return [];
    
    setTransactionInProgress(true);

    // sign and submit transaction to chain
    let lock_dur_secs;
    console.log(values);

    if(values.timeperiod == "1 day"){
        lock_dur_secs = 600;
        //lock_dur_secs = 86400;
    }
    else if(values.timeperiod == "1 week"){
        lock_dur_secs = 604800;
    }
    else if(values.timeperiod == "1 month"){
        lock_dur_secs = 2592000;
    }
    else if(values.timeperiod == "custom"){
        lock_dur_secs = values.custom_timeperiod;
    }
    
    lock_dur_secs = Number(lock_dur_secs);
    let entryFee = Number(values.entryFee);

    const txn = signAndSubmitTransaction({
        sender: account?.address,
        data: {
          function:`${moduleAddress}::habit_trackerv1::create_task`,
          functionArguments:[lock_dur_secs, entryFee, false,[], values.name, values.description, []]
        }
      })
      try {
        let txnn = await aptos.waitForTransaction({transactionHash:txn.hash});
        console.log(txnn);

    } catch (error) {
        console.log(error);
    }

    form.resetFields()
    notification.success({
      message: 'Goal Created',
      description: `Your goal "${values.name}" has been created successfully!`,
    })
  }

  const handleParticipate = async(id) => {
    setGoals(goals.map(goal => 
      goal.id === id ? { ...goal, isParticipating: true, participants: goal.participants + 1 } : goal
    ))

    const txn = signAndSubmitTransaction({
        sender: account?.address,
        data: {
          function:`${moduleAddress}::habit_trackerv1::buy_ticket`,
          functionArguments:[account?.address]
        }
      })
      try {
        let txnn = await aptos.waitForTransaction({transactionHash:txn.hash});
        console.log(txnn);

    } catch (error) {
        console.log(error);
    }

    notification.info({
      message: 'Joined Goal',
      description: 'You have successfully joined this goal. Good luck!',
    })
  }

  const handleComplete = async(id) => {
    setCurrentGoal(goals.find(goal => goal.id === id))
    setIsPhotoUploadOpen(true)
  }

  const handlePhotoSubmit = async(photo) => {
    const photoUrl = URL.createObjectURL(photo)
    setGoals(goals.map(goal => 
      goal.id === currentGoal.id 
        ? { 
            ...goal, 
            isCompleted: true, 
            submissions: [...goal.submissions, { id: goal.submissions.length + 1, userId: 1, photoUrl, upvotes: 0 }]
          } 
        : goal
    ))

    const txn = signAndSubmitTransaction({
        sender: account?.address,
        data: {
          function:`${moduleAddress}::habit_trackerv1::submit_task`,
          functionArguments:[moduleAddress, photoUrl]
        }
      })
      try {
        let txnn = await aptos.waitForTransaction({transactionHash:txn.hash});
        console.log(txnn);

    } catch (error) {
        console.log(error);
    }

    notification.success({
      message: 'Submission Uploaded',
      description: 'Your completion photo has been uploaded successfully!',
    })
  }

  const handleUpvote = async(goalId, submissionId) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { 
            ...goal, 
            submissions: goal.submissions.map(sub => 
              sub.id === submissionId ? { ...sub, upvotes: sub.upvotes + 1 } : sub
            )
          } 
          : goal
    ))

    const txn = signAndSubmitTransaction({
        sender: account?.address,
        data: {
          function:`${moduleAddress}::habit_trackerv1::upvote_submission`,
          functionArguments:[goalId, moduleAddress]
        }
      })
      try {
        let txnn = await aptos.waitForTransaction({transactionHash:txn.hash});
        console.log(txnn);

    } catch (error) {
        console.log(error);
    }

  }

  const handleDistributeFunds = async(goalId) => {
    setGoals(goals.map(goal => {
      if (goal.id === goalId) {
        const totalUpvotes = goal.submissions.reduce((sum, sub) => sum + sub.upvotes, 0)
        const winners = goal.submissions
          .filter(sub => (sub.upvotes / totalUpvotes) > 0.8)
          .map(sub => ({ userId: sub.userId, amount: (goal.entryFee * goal.participants) / winners.length }))
        return { ...goal, winners }
      }
      return goal
    }))

    const txn = signAndSubmitTransaction({
        sender: account?.address,
        data: {
          function:`${moduleAddress}::habit_trackerv1::distribute_funds`,
          functionArguments:[]
        }
      })
      try {
        let txnn = await aptos.waitForTransaction({transactionHash:txn.hash});
        console.log(txnn);

    } catch (error) {
        console.log(error);
    }


    notification.success({
      message: 'Funds Distributed',
      description: 'The funds have been distributed to the winners!',
    })
  }

  const getTimeInMilliseconds = (timeperiod) => {
    switch (timeperiod) {
      case '1 day': return 24 * 60 * 60 * 1000
      case '1 week': return 7 * 24 * 60 * 60 * 1000
      case '1 month': return 30 * 24 * 60 * 60 * 1000
      default: return 24 * 60 * 60 * 1000 // Default to 1 day
    }
  }


    return (
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#ffffff',
            colorBgContainer: '#000000',
            colorText: '#ffffff',
          },
        }}
      >
        <Layout className="min-h-screen bg-black text-white">
          <Sider width={200} className="bg-gray-900">
            <div className="h-32 flex items-center justify-center">
              <Title level={3} className="text-white m-0">HabitPool</Title>
            </div>
            <div className="flex flex-col space-y-2 p-4">
              <Button type="text" icon={<FireOutlined />} className="text-left text-white">
                Active Goals
              </Button>
              <Button type="text" icon={<TrophyOutlined />} onClick={() => setIsLeaderboardOpen(true)} className="text-left text-white">
                Leaderboard
              </Button>
            </div>
          </Sider>
          <Layout>
            <Header className="bg-black flex items-center justify-between px-4 border-b border-gray-800">
              
              <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateGoalOpen(true)} className="gradient-button">
                Create New Goal
              </Button>
              <WalletSelector/>
              </Space>
            </Header>
            <Content className="p-8 bg-black">
              <Space direction="vertical" size="large" className="w-full">
                {goals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onParticipate={handleParticipate}
                    onComplete={handleComplete}
                    onUpvote={handleUpvote}
                    onDistributeFunds={handleDistributeFunds}
                  />
                ))}
              </Space>
            </Content>
          </Layout>
  
          <Modal
            title="Create New Goal"
            open={isCreateGoalOpen}
            onCancel={() => setIsCreateGoalOpen(false)}
            footer={null}
            destroyOnClose={true}
          >
            <Form form={form} onFinish={handleCreateGoal} layout="vertical">
              <Form.Item name="name" label="Task Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="description" label="Task Description" rules={[{ required: true }]}>
                <Input.TextArea />
              </Form.Item>
              <Form.Item name="timeperiod" label="Time Period" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="1 day">1 Day</Radio>
                  <Radio value="1 week">1 Week</Radio>
                  <Radio value="1 month">1 Month</Radio>
                  <Radio value="custom">Custom</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="entryFee" label="Entry Fee (OCTA - 1 apt = 10^8 octas)" rules={[{ required: true }]}>
                <Input type="number" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" className="gradient-button">
                  Create Goal
                </Button>
              </Form.Item>
            </Form>
          </Modal>
  
          <PhotoUpload 
            isOpen={isPhotoUploadOpen} 
            onClose={() => setIsPhotoUploadOpen(false)} 
            onSubmit={handlePhotoSubmit} 
          />
  
          <LeaderboardModal
            isOpen={isLeaderboardOpen}
            onClose={() => setIsLeaderboardOpen(false)}
            goals={goals}
          />
        </Layout>
      </ConfigProvider>
    )
  }