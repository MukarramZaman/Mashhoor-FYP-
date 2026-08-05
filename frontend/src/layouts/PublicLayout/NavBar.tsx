import { Title } from "../../components";
import { Link, useLocation } from "react-router-dom";

const scrollToSection = (id: string) => {
  const section = document.getElementById(id);
  section?.scrollIntoView({ behavior: "smooth" });
};

const handleLogoClick = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

function NavBar() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  return (
    <>
      <div className="navBar flex justify-between p-3">
        <div onClick={handleLogoClick} className="Logo cursor-pointer">
          <Title />
        </div>
        <div className="Menu  p-1 flex justify-center gap-5 text-lg">
          <div>
            <span
              className="tap"
              onClick={() => isLandingPage && scrollToSection("features")}
            >
              Features
            </span>
          </div>
          <div>
            <span className="tap " onClick={() => scrollToSection("working")}>
              How Its Work
            </span>
          </div>
          <div>
            <span className="tap " onClick={() => scrollToSection("about")}>
              About
            </span>
          </div>
          <div>
            <button className="rounded-xl px-3 btn-login">
              <Link to="/login" className="text-base">
                Login
              </Link>
            </button>
          </div>
          <div>
            <button className="btn rounded-xl bg-black px-3">
              <Link to="/signup" className="text-base text-white bg-black">
                Get Started
              </Link>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default NavBar;
