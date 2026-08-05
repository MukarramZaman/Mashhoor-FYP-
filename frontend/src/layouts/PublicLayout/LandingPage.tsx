import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <>
      <div className="HeroSection flex m-5">
        <div className="introSection ">
          <div className="inline-flex gap-1 rounded-full px-3 py-1 transpurple m-5">
            <img src="/assets/sparkle.svg" alt="" />
            <div>AI-Powered Platform</div>
          </div>
          <div className="text-6xl mx-5">
            Connect with the{" "}
            <span className="bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Perfect Influencers
            </span>
          </div>
          <div className="m-5 text-2xl text-gray-400">
            <p>
              Mashhoor is the leading AI-powered influencer marketing platform
              that helps brands discover, connect, and collaborate with verified
              influencers at scale.
            </p>
          </div>
          <div className="flex gap-5 m-5">
            <Link to="/signup">
              <button className="bg-linear-to-r from-purple-500 to-blue-500 rounded-lg px-3 py-2 text-white font-medium hover:opacity-90 transition-opacity">
                Get Started Free
              </button>
            </Link>
            <button className="px-3 py-2 btnEI rounded-lg">
              Explore Influencers
            </button>
          </div>
          <div className="stats flex justify-baseline gap-5 m-5">
            <div className="stat">
              <div className="text-4xl">10K+</div>
              <div className="text-gray-400">Verified influencers</div>
            </div>
            <div className="stat">
              <div className="text-4xl">5K+</div>
              <div className="text-gray-400">Successfull campaigns</div>
            </div>
            <div className="stat">
              <div className="text-4xl">98%</div>
              <div className="text-gray-400">Satisfaction Rate</div>
            </div>
          </div>
        </div>
        <div className="imgSection relative">
          <img
            src="/assets/photo.jpeg"
            className="rounded-2xl drop-shadow-2xl"
            alt=""
          />
          <div className="bg-white absolute -bottom-4 -left-6 px-4 py-2 rounded-xl shadow-lg">
            <div className="flex justify-center align-middle gap-4">
              <div className="bg-[#00a63d]/20 rounded-full p-4">
                <img src="/assets/circle-check.svg" alt="" />
              </div>
              <div>
                <div>Campaign Success</div>
                <div className="text-gray-400 text-base">+127% ROI</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LandingPage;
