import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  // Add useMediaQuery and useTheme for better responsiveness (optional but good practice)
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon, // Renamed to avoid conflict if you had a component called Dashboard
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  Layers as TemplatesIcon, // Changed Template to Layers as Template is not a standard MUI icon
  People as PeopleIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Ensure this path is correct

// --- IMPORTANT: Icon Troubleshooting ---
// If you're still getting 'undefined' for icons, the issue is likely with
// @mui/icons-material installation or a typo in your import.
// Run: npm uninstall @mui/icons-material && npm install @mui/icons-material
// Make sure your @mui/material version is compatible.
// console.log('Icons imported:', {
//   Dashboard: typeof DashboardIcon,
//   Assessment: typeof AssessmentIcon,
//   Description: typeof DescriptionIcon,
//   Template: typeof TemplatesIcon, // Using TemplatesIcon now
//   People: typeof PeopleIcon,
//   Settings: typeof SettingsIcon,
//   Person: typeof PersonIcon,
//   AdminPanelSettings: typeof AdminPanelSettingsIcon,
// });
// --- END Icon Troubleshooting ---

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
  { text: 'Create Report', icon: <DescriptionIcon />, path: '/reports/create' },
  { text: 'Templates', icon: <TemplatesIcon />, path: '/templates' },
  { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const adminMenuItems = [
  { text: 'User Management', icon: <PeopleIcon />, path: '/admin/users' },
  { text: 'Admin Panel', icon: <AdminPanelSettingsIcon />, path: '/admin' },
];

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme(); // For responsive design
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Adjust 'sm' as needed

  // Directly use auth context. If useAuth throws an error here,
  // it means Sidebar is not rendered within AuthProvider.
  // This is a correct way to handle it as it exposes the structural problem.
  const { user, loading } = useAuth(); 

  const handleNavigation = (path) => {
    navigate(path);
    // Automatically close sidebar on navigation for mobile
    if (isMobile) {
      onClose();
    }
  };

  const isActive = (path) => {
    // For exact match, or if you want to highlight parent routes, adjust logic
    return location.pathname === path;
  };

  // Add safety check for user object and loading state
  const isAdmin = user && (user.role === 'admin' || user.role === 'manager');

  // Do not render if still loading authentication data
  if (loading) {
    return null; // Or a loading spinner if desired
  }

  return (
    <Drawer
      // For persistent sidebar on desktop, temporary/modal on mobile
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="left"
      open={open}
      onClose={onClose} // Add onClose for temporary variant to allow closing
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          // Adjust top based on AppBar height. This assumes your AppBar is 64px.
          // For more dynamic height, you might need to pass AppBar height or use CSS variables.
          mt: isMobile ? '0px' : '64px', 
          height: isMobile ? '100%' : 'calc(100% - 64px)', // Take up full height on mobile
          // For temporary variant, ensure it sits above content
          ...(isMobile && {
            position: 'absolute', // Ensures it covers content and not pushes it
            top: 0,
          }),
        },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        {/* Optional: Add a title or logo at the top of the sidebar */}
        {!isMobile && ( // Hide this title on mobile as AppBar will have title
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            {/* You could put your logo or app name here */}
            <Typography variant="h6" noWrap component="div">
              My App
            </Typography>
          </Box>
        )}
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    color: isActive(item.path) ? 'primary.main' : 'inherit',
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {isAdmin && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="overline" color="text.secondary">
                Administration
              </Typography>
            </Box>
            <List>
              {adminMenuItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    selected={isActive(item.path)}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        color: isActive(item.path) ? 'primary.main' : 'inherit',
                        fontWeight: isActive(item.path) ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;