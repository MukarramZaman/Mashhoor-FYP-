import { Link } from "react-router-dom";
import { Title } from "../../components";

function About() {
  return (
    <>
      <div className="about mt-15 mb-9">
        <div className="mx-10 my-5">
          <div className="container p-5 rounded-xl flex flex-col gap-5 bg-linear-to-r from-purple-600 to-blue-600">
            <div className="text-4xl text-center">
              Ready to Transform Your Marketing?
            </div>
            <div className="text-2xl text-center">
              Join thousands of brands and influencers already using Mashhoor
            </div>
            <div className=" flex justify-center gap-5">
              <Link to="/signup">
                <button className="bg-white px-3 py-2 btnabout rounded-lg">
                  Get Started
                </button>
              </Link>
              <Link to="/login">
                <button className="bg-white px-3 py-2 btnabout rounded-lg">
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
        <div className="contact flex justify-evenly gap-5">
          <div className="tile">
            <Title />
            <div className="py-2">
              AI-powered influencer marketing platform connecting brands with
              creators.
            </div>
          </div>
          <div className="tile">
            <div className="text-xl pb-2">Product</div>
            <div>
              <ul>
                <li>
                  <a href="">Features</a>
                </li>
                <li>
                  <a href="">Pricing</a>
                </li>
                <li>
                  <a href="">Case Studies</a>
                </li>
                <li>
                  <a href="">Reviews</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="tile">
            <div className="text-xl pb-2">Company</div>
            <div>
              <ul>
                <li>
                  <a href="">About</a>
                </li>
                <li>
                  <a href="">Blog</a>
                </li>
                <li>
                  <a href="">Careers</a>
                </li>
                <li>
                  <a href="">Contacts</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="tile">
            <div className="text-xl pb-2">Legal</div>
            <div>
              <ul>
                <li>
                  <a href="">Privacy Policy</a>
                </li>
                <li>
                  <a href="">Terms of Service</a>
                </li>
                <li>
                  <a href="">Cookies Policies</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer text-base p-4 text-center text-gray-400">
          © 2025 Mashhoor. All rights reserved.
        </div>
      </div>
    </>
  );
}

export default About;
