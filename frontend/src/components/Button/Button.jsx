import './button.css';

const Button = ({ children, onClick }) => {
    return (
        <button className="button__block" onClick={onClick}>
            <p>{children}</p>
        </button>
    );
};

export default Button;
