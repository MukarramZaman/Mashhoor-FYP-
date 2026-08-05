import '../App.css';
import logo from '../assets/mashhoorLogo.svg';

function Logo() {
    return (
        <>
            <div className="img bg-linear-to-br from-blue-500 to-purple-500 flex justify-center rounded-xl w-9 h-9 p-1">
                <img src={logo} alt="Mashhoor Logo" />
            </div>
        </>
    )
}
export default Logo;