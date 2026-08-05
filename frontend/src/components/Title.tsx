import Logo from "./Logo";
import '../App.css';
function Title() {
    return (
        <div className='title flex gap-2 cursor-pointer'>
            <Logo />
            <div className="name text-2xl font-medium text-gray-900">Mashhoor</div>
        </div>
    )
}

export default Title;