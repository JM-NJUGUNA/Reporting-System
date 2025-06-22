import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Users = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">Users</Typography>
          <Typography variant="body2" color="textSecondary">
            Manage system users and permissions
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Users;
