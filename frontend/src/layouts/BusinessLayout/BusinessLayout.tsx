import { Outlet } from "react-router-dom";
import { BusinessNav } from "../../components";
const BusinessLayout = () => {
  return (
    <>
      <BusinessNav />
      <Outlet />
    </>
  );
};

export default BusinessLayout;
