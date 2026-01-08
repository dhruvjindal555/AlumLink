import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from './userContext';

const ProtectedRoute = () => {


  const { user, ready } = useContext(UserContext);

  if (!ready) return null; // or loader

  if (!user) {
    console.log('Enforced protected routes');
    return <Navigate to="/login" />;
  }


  return <Outlet />;
};

export default ProtectedRoute;