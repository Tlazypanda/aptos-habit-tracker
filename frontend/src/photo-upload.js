import React, { useState } from 'react'
import { Modal, Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

const { Dragger } = Upload

export default function PhotoUpload({ isOpen, onClose, onSubmit }) {
  const [fileList, setFileList] = useState([])

  const handleUpload = () => {
    const file = fileList[0]
    if (file) {
      onSubmit(file)
      setFileList([])
      message.success('Photo uploaded successfully')
      onClose()
    } else {
      message.error('Please select a photo to upload')
    }
  }

  const props = {
    onRemove: () => {
      setFileList([])
    },
    beforeUpload: (file) => {
      setFileList([file])
      return false
    },
    fileList,
  }

  return (
    <Modal
      title="Upload Completion Photo"
      open={isOpen}
      onCancel={onClose}
      onOk={handleUpload}
      okText="Submit"
      className="bg-gray-800 text-gray-100"
    >
      <Dragger {...props} className="bg-gray-700 border-neon-blue hover:border-neon-blue-bright">
        <p className="ant-upload-drag-icon">
          <InboxOutlined className="text-neon-blue" />
        </p>
        <p className="ant-upload-text text-gray-300">Click or drag file to this area to upload</p>
        <p className="ant-upload-hint text-gray-400">
          Support for a single image upload. Strictly prohibit from uploading company data or other
          sensitive files.
        </p>
      </Dragger>
    </Modal>
  )
}