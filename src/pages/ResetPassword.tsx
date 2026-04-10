import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect any external reset-password links back to the auth page
const ResetPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to auth page - all password resets happen in-app via OTP
    navigate('/auth', { replace: true });
  }, [navigate]);

  return null;
};

export default ResetPassword;
