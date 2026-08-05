import '../App.css'
type WorkingBoxProps = {
  img: string;
  heading: string;
  text: string;
};
function WorkingBox({img,heading,text}:WorkingBoxProps) {
    return (<>
    <div className='working-box'>
            <div><img src={img}  alt="" /></div>
            <div className='working-heading'>{heading}</div>
            <div className='working-text'>{text}</div>
          </div>
    </>)   
}

export default WorkingBox