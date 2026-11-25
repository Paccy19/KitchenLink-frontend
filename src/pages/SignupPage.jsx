import React from 'react';
import { useNavigate } from 'react-router-dom';
import RoleSelectModal from '../components/auth/RoleSelectModal';

export default function SignupPage() {
  const navigate = useNavigate();
  return <RoleSelectModal open onClose={() => navigate('/', { replace: true })} />;
}
