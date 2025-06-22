import React from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';

const Reports = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Reports Management</Typography>
              <Typography variant="body2" color="textSecondary">
                Manage and generate SASRA compliance reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
