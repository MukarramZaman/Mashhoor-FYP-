import { WorkingBox } from "../../components";

const workingData = [
  {
    img: "/assets/analytic-photo.jpeg",
    heading: "Analytics Dashboard",
    text: "Track your campaign performance in real-time",
  },
  {
    img: "/assets/influencer-discovery.jpeg",
    heading: "Influencer Discovery",
    text: "Find and connect with verified influencers",
  },
];
function Working() {
  return (
    <>
      {" "}
      <div className="working flex flex-col gap-7 my-15 mx-10">
        <div className="text-4xl text-center">See It In Action</div>
        <div className="text-2xl text-gray-400 text-center">
          Powerful dashboard and intuitive interface
        </div>
        <div className="p-5 flex justify-evenly gap-5">
          {workingData.map((work, index) => (
            <WorkingBox
              key={index}
              img={work.img}
              heading={work.heading}
              text={work.text}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default Working;
