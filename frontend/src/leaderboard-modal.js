import React from 'react'
import { Modal, Table, Tag } from 'antd'

export default function LeaderboardModal({ isOpen, onClose, goals }) {
  const leaderboardData = goals.flatMap(goal => 
    goal.winners.map(winner => ({
      key: `${goal.id}-${winner}`,
      userId: winner,
      goalName: goal.name,
      amount: goal.per_winner_amt,
    }))
  ).sort((a, b) => b.amount - a.amount)

  const columns = [
    {
      title: 'User',
      dataIndex: 'userId',
      key: 'userId',
      render: userId => <Tag color="blue">User {userId}</Tag>,
    },
    {
      title: 'Goal',
      dataIndex: 'goalName',
      key: 'goalName',
    },
    {
      title: 'Winnings',
      dataIndex: 'amount',
      key: 'amount',
      render: amount => <span className="text-neon-green">{amount*0.00000001} APT</span>,
    },
  ]

  return (
    <Modal
      title="Leaderboard"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={800}
      className="bg-gray-800 text-gray-100"
    >
      <Table 
        dataSource={leaderboardData} 
        columns={columns} 
        pagination={false}
        className="bg-gray-700"
      />
    </Modal>
  )
}