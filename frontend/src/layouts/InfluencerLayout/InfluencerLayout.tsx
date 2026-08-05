import { Outlet } from "react-router-dom";
import { DashboardNav } from "../../components";
const InfluencerLayout = () => {
  return (
    <>
      <DashboardNav />
      <Outlet />
    </>
  );
};

export default InfluencerLayout;
