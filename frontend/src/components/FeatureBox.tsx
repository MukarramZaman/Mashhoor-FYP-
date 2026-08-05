import '../App.css'

import '../App.css';

type FeatureBoxProps = {
  img: string;
  heading: string;
  text: string;
};

function FeatureBox({img,heading,text}:FeatureBoxProps) {
    return(
        <>
        <div className="box">
            <div><img src={img} alt="" className='box-img' /></div>
          <div className='box-heading'>{heading}</div>
          <div className='box-text'>{text}</div>
          </div>
        </>
    )
}
export default FeatureBox