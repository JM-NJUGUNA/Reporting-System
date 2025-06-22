import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const ReportDetail = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Report Detail
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">Report Information</Typography>
          <Typography variant="body2" color="textSecondary">
            Detailed view of the selected report
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReportDetail;
