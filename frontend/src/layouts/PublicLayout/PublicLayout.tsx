import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

const PublicLayout = () => {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
};

export default PublicLayout;
