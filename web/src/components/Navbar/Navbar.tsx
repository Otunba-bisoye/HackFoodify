import { Link } from 'react-router-dom'
import { assets } from '../../assets/assets'
import './Navbar.css'
import { useState } from 'react';
import { CircleChevronDown, ShoppingCart } from 'lucide-react';


const Navbar = () => {

    const [currentRegion, setCurrentRegion] = useState('Abeokuta');
    const [isOpen, setIsOpen] = useState(false);
    const [isProductsOpen, setIsProductsOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const regions = ['Abeokuta', 'Lagos', 'Abuja', 'Ibadan'];
    const productLinks = [
        { label: 'Ads', to: '/ads' },
        { label: 'Relay', to: '/relay' },
    ];
    const moreLinks = [
        { label: 'Blog', to: '/blog' },
        { label: 'FAQs', to: '/faqs' },
        { label: 'Contact Us', to: '/contact' },
        { label: 'Terms & Privacy', to: '/terms' },
    ];

  return (
    <div className="navbar">
        <div className="left">
            <Link to="/"><img src={assets.foodify_large} alt="" className='logo'/></Link>
            <div 
                className="region-selector"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="region-button"
                >
                    <span>{currentRegion}</span>
                    <CircleChevronDown size={12} className={`region ${isOpen ? "open" : "close"}`}/>
                </button>

                {isOpen && (
                    <div className="nav-dropdown-menu right-aligned" >
                    {regions.map((reg) => (
                        <div
                            key={reg}
                            onClick={() => {
                                setCurrentRegion(reg);
                                setIsOpen(false);
                            }}
                            className={`region-option ${currentRegion === reg ? 'active' : ''}`}
                        >
                            {reg}
                        </div>
                    ))}
                    </div>
                )}
            </div>
        </div>
        <div className="middle">
            <Link to="/company" className="nav-link"> Company </Link>

            <Link to="/champions" className="nav-link"> Champions </Link>

            <Link to="/vendors" className="nav-link"> Vendors </Link>

            <div
                className="nav-dropdown-wrapper"
                onMouseEnter={() => setIsProductsOpen(true)}
                onMouseLeave={() => setIsProductsOpen(false)}
            >
                <button
                type="button"
                onClick={() => setIsProductsOpen((prev) => !prev)}
                className="nav-link nav-dropdown-trigger"
                >
                <span>Products</span>
                <CircleChevronDown
                    size={12}
                    className={`nav-chevron ${isProductsOpen ? 'open' : ''}`}
                />
                </button>

                {isProductsOpen && (
                <div className="nav-dropdown-menu">
                    {productLinks.map((item) => (
                    <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setIsProductsOpen(false)}
                        className="nav-dropdown-item"
                    >
                        {item.label}
                    </Link>
                    ))}
                </div>
                )}
            </div>
        </div>
        <div className="right">
            <div
                className="nav-dropdown-wrapper"
                onMouseEnter={() => setIsMoreOpen(true)}
                onMouseLeave={() => setIsMoreOpen(false)}
            >
                <button
                type="button"
                onClick={() => setIsMoreOpen((prev) => !prev)}
                className="more-button"
                >
                <span>More</span>
                <CircleChevronDown
                    size={12}
                    className={`nav-chevron ${isMoreOpen ? 'open' : ''}`}
                />
                </button>

                {isMoreOpen && (
                <div className="nav-dropdown-menu right-aligned">
                    {moreLinks.map((item) => (
                    <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setIsMoreOpen(false)}
                        className="nav-dropdown-item"
                    >
                        {item.label}
                    </Link>
                    ))}
                </div>
                )}
            </div>

            {/* Circular Cart Button */}
            <Link to="/cart" className="cart-button" aria-label="View Cart">
                <ShoppingCart  size={18} strokeWidth={2.2} />
                <span className="cart-badge">0</span>
            </Link>
        </div>
    </div>
  )
}

export default Navbar