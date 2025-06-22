import React, { useState } from 'react';
import styled from 'styled-components';

// Styled Components
const PageWrapper = styled.div`
  background-color: #f0f2f5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background-color: #004080;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.h1`
  font-size: 1.5rem;
  margin: 0;
`;

const UserInfo = styled.div`
  font-size: 0.9rem;
`;

const Nav = styled.nav`
  background-color: white;
  padding: 0 2rem;
  border-bottom: 1px solid #ddd;
`;

const NavTabs = styled.div`
  display: flex;
`;

const NavTab = styled.button`
  padding: 1rem 1.5rem;
  border: none;
  background-color: transparent;
  cursor: pointer;
  font-size: 1rem;
  color: ${props => (props.active ? '#004080' : '#555')};
  border-bottom: ${props => (props.active ? '3px solid #004080' : '3px solid transparent')};
  margin-bottom: -1px;

  &:hover {
    background-color: #f8f9fa;
  }
`;

const MainContent = styled.main`
  padding: 2rem;
  flex-grow: 1;
`;

const ReportCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 1200px;
  margin: 0 auto;
`;

const CardTitle = styled.h2`
  font-size: 1.75rem;
  margin-top: 0;
`;

const CardSubtitle = styled.p`
  color: #666;
  margin-bottom: 2rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const FormControl = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #333;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
`;

const GenerateButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: bold;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;

  &:hover {
    background-color: #0056b3;
  }
`;

const SuccessMessage = styled.div`
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 2rem;
`;

const CreateReport = () => {
  const [activeTab, setActiveTab] = useState('Generate Reports');
  const [reportGenerated, setReportGenerated] = useState(false);

  const handleGenerateReport = () => {
    // Logic to generate the report would go here
    setReportGenerated(true);
  };

  return (
    <PageWrapper>
      <Header>
        <Logo>Lidar Business Solutions - SASRA Reporting System</Logo>
        <UserInfo>
          <span>🟢 System Online</span> | <span>Admin User</span> | <span>Last Login: Today 08:30</span>
        </UserInfo>
      </Header>
      <Nav>
        <NavTabs>
          <NavTab active={activeTab === 'Generate Reports'} onClick={() => setActiveTab('Generate Reports')}>
            Generate Reports
          </NavTab>
          <NavTab active={activeTab === 'Real-Time Dashboard'} onClick={() => setActiveTab('Real-Time Dashboard')}>
            Real-Time Dashboard
          </NavTab>
          <NavTab active={activeTab === 'Automated Scheduling'} onClick={() => setActiveTab('Automated Scheduling')}>
            Automated Scheduling
          </NavTab>
          <NavTab active={activeTab === 'Data Validation'} onClick={() => setActiveTab('Data Validation')}>
            Data Validation
          </NavTab>
          <NavTab active={activeTab === 'Audit Trail'} onClick={() => setActiveTab('Audit Trail')}>
            Audit Trail
          </NavTab>
        </NavTabs>
      </Nav>
      <MainContent>
        <ReportCard>
          <CardTitle>One-Click SASRA Report Generation</CardTitle>
          <CardSubtitle>Generate monthly, quarterly, and annual reports with built-in SASRA formatting</CardSubtitle>
          <FormGrid>
            <FormControl>
              <Label htmlFor="report-type">Report Type</Label>
              <Select id="report-type">
                <option>Monthly SASRA Prudential Rep</option>
              </Select>
            </FormControl>
            <FormControl>
              <Label htmlFor="reporting-period">Reporting Period</Label>
              <Input id="reporting-period" type="month" defaultValue="2024-06" />
            </FormControl>
            <FormControl>
              <Label htmlFor="output-format">Output Format</Label>
              <Select id="output-format">
                <option>Excel (.xlsx) - SASRA Standard</option>
              </Select>
            </FormControl>
            <FormControl>
              <Label htmlFor="include-visualizations">Include Visualizations</Label>
              <Select id="include-visualizations">
                <option>Yes - Include Charts & Graphs</option>
                <option>No</option>
              </Select>
            </FormControl>
          </FormGrid>
          <GenerateButton onClick={handleGenerateReport}>Generate Report</GenerateButton>
          {reportGenerated && (
            <SuccessMessage>
              <strong>Report Generated Successfully</strong>
              <p>File: SASRA_Monthly_Prudential_Report_June_2024.xlsx</p>
              <p>Size: 2.4 MB</p>
            </SuccessMessage>
          )}
        </ReportCard>
      </MainContent>
    </PageWrapper>
  );
};

export default CreateReport;
