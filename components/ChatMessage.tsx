import React from 'react';
import { Message, Role } from '../types';
import { UserIcon, BotIcon } from './icons';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <BotIcon />}
      <div
        className={`max-w-2xl p-4 rounded-xl shadow-sm ${
          isUser
            ? 'bg-white border border-gray-200'
            : 'bg-blue-50 border border-blue-100'
        }`}
      >
        <p className="whitespace-pre-wrap text-base text-gray-700">{message.content}</p>
      </div>
      {isUser && <UserIcon />}
    </div>
  );
};
