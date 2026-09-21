import React from 'react';

interface AvatarProps {
  name: string;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size, onClick, className = '' }) => {
  const initial = name.charAt(0).toUpperCase();
  const style = size ? { width: size, height: size, fontSize: size * 0.42 } : undefined;

  return (
    <span
      className={`user-avatar ${className}`}
      style={style}
      onClick={onClick}
    >
      {initial}
    </span>
  );
};

interface UserPillProps {
  name: string;
  onClick?: () => void;
  className?: string;
}

export const UserPill: React.FC<UserPillProps> = ({ name, onClick, className = '' }) => (
  <div className={`user-pill ${className}`} onClick={onClick}>
    <Avatar name={name} />
    <span>{name}</span>
  </div>
);
