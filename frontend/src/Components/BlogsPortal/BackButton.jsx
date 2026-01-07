import { IconButton, AppBar, Toolbar, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ title = "Blog Details" }) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/blogs');
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
      <Toolbar sx={{ minHeight: '56px !important', px: 2 }}>
        <IconButton 
          edge="start" 
          onClick={handleBackClick}
          sx={{ 
            mr: 2, 
            color: '#374151',
            '&:hover': {
              bgcolor: '#f3f4f6'
            }
          }}
        >
          <ArrowBack />
        </IconButton>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            color: '#111827', 
            fontWeight: 500,
            fontSize: '1.1rem'
          }}
        >
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default BackButton;