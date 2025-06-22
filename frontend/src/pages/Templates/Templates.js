import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Templates = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Templates
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">Report Templates</Typography>
          <Typography variant="body2" color="textSecondary">
            Manage report templates and formats
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Templates;
