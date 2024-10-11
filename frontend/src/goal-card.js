import React from 'react'
import { Typography, Button, Progress, Space, Splitter, Statistic, Image, Card } from 'antd'
import { UploadOutlined, TeamOutlined, DollarOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function GoalCard({ goal, onParticipate, onComplete, onUpvote, onDistributeFunds }) {
  const timeLeft = Math.max(0, Math.ceil((goal.endDate - new Date()) / (1000 * 60 * 60 * 24)))
  const progress = 100 - (timeLeft / (goal.timeperiod === '1 week' ? 7 : 30)) * 100
  let hardcodedImages = [
    'https://boldfit.in/cdn/shop/products/Artboard1_a9687ad8-19a0-446d-b59b-4d875660f899_1500x.png?v=1654161136',
    'https://media.gettyimages.com/id/1288737452/photo/you-are-strong-strong-is-you.jpg?s=612x612&w=gi&k=20&c=c82gj2VMJu5S_c1Cp7g9czUFPisYnDYAEcvdpJCDk7M=',
    'https://img.freepik.com/free-photo/full-length-happy-sportswoman-jogging-road-morning-copy-space_637285-3764.jpg'
  ]
  return (
    <div className="mb-8 pb-8 border-b border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="text-white m-0">{goal.name}</Title>
        
        {!goal.isParticipating && (
          <Button onClick={() => onParticipate(goal.id)} className="gradient-button">
            Participate
          </Button>
        )}
        {goal.isParticipating && !goal.isCompleted && (
          <Button onClick={() => onComplete(goal.id)} icon={<UploadOutlined />} className="gradient-button">
            Mark as Complete
          </Button>
        )}
      </div>
      <div className="flex justify-between items-center mb-4">
        
        <Text className="text-gray-400  m-0">{goal.description}</Text>
        </div>
      <Space className="w-full justify-between mb-6">
        <Statistic title="Entry Fee" value={goal.entryFee*0.00000001} prefix={<DollarOutlined />} />
        <Statistic title="Participants" value={goal.participants} prefix={<TeamOutlined />} />
  
      </Space>

      <Progress percent={progress} showInfo={false} strokeColor="#00ffff" trailColor="#333333" />
      <Text className="text-gray-400 block mt-2">{timeLeft} days left</Text>
      {goal.submissions.length > 0 && (
        <div className="mt-4">
          <Title level={5} className="text-white mb-2">Submissions:</Title>
          <Space wrap>
            {goal.submissions.map((submission, index) => (
              <Card extra={<Button onClick={() => onUpvote(goal.id, submission.id)} size="small" className="gradient-button">
              Upvote ({submission.upvotes})
            </Button>}>
              <div key={submission.id} className="text-center">
                <Image width={100} height={100} src={hardcodedImages[index]} alt="Submission" className="w-24 h-24 object-cover rounded mb-2" />
                {/*<img src={submission.link} alt="Submission" className="w-24 h-24 object-cover rounded mb-2" />*/}
                
                
              </div>
              </Card>
            ))}
          </Space>
        </div>
      )}
      {goal.isEnded  && (
        <Button onClick={() => onDistributeFunds(goal.id)} className="gradient-button mt-4">
          Distribute Funds
        </Button>
      )}
      {goal.winners.length > 0 && (
        <div className="mt-4">
          <Title level={5} className="text-white mb-2">Winners:</Title>
          <Splitter layout="vertical" style={{ height: 100, boxShadow: '0 0 100px rgba(1, 1, 1, 0.1)' }}>

          {goal.winners.map((winner, index) => (
            <Splitter.Panel>
            <Text key={index} className="text-gray-400 block">
              User {winner.slice(0,7)}... : {goal.per_winner_amt*0.00000001} APT       
            </Text>
            </Splitter.Panel>
          ))}
          </Splitter>
        </div>
      )}
    </div>
  )
}