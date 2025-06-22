import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import {
  TrendingUp,
  People,
  AccountBalance,
  Assessment,
} from '@mui/icons-material';

const Dashboard = () => {
  const metrics = [
    {
      title: 'Total Members',
      value: '2,847',
      change: '+12%',
      icon: <People />,
      color: 'primary.main',
    },
    {
      title: 'Total Assets',
      value: 'KES 45.2M',
      change: '+8.5%',
      icon: <AccountBalance />,
      color: 'success.main',
    },
    {
      title: 'Active Loans',
      value: '1,234',
      change: '+5.2%',
      icon: <TrendingUp />,
      color: 'warning.main',
    },
    {
      title: 'Reports Generated',
      value: '156',
      change: '+23%',
      icon: <Assessment />,
      color: 'info.main',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {metric.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {metric.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: metric.color, fontSize: 40 }}>
                    {metric.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
