import { FeatureBox } from "../../components";
const featuresData = [
  {
    img: "/assets/sparkle.svg",
    heading: "AI-Powered Matching",
    text: "Our intelligent algorithm connects you with the perfect influencers for your brand",
  },
  {
    img: "/assets/target.svg",
    heading: "Precise Targeting",
    text: "Filter by niche, location, engagement rates, and trust scores",
  },
  {
    img: "/assets/trending-up.svg",
    heading: "Analytics & Insights",
    text: "Track campaign performance with real-time analytics and ROI predictions",
  },
  {
    img: "/assets/shield.svg",
    heading: "Trust Score System",
    text: "Verified influencers with transparent trust ratings and past collaboration history",
  },
  {
    img: "/assets/contact-round.svg",
    heading: "Direct Communication",
    text: "Built-in messaging and outreach tools to streamline collaboration",
  },
  {
    img: "/assets/chart-column.svg",
    heading: "Campaign Management",
    text: "Create, manage, and track all your campaigns in one centralized platform",
  },
];
function Features() {
  return (
    <>
      <div className="features flex flex-col gap-7 mt-20 mx-10 ">
        <div className="text-4xl text-center">Powerful Features</div>
        <div className="text-gray-400 text-center text-2xl">
          Everything you need to run successful influencer marketing campaigns
        </div>

        <div className="gridbox grid md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
          {featuresData.map((feature, index) => (
            <FeatureBox
              key={index}
              img={feature.img}
              heading={feature.heading}
              text={feature.text}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default Features;
