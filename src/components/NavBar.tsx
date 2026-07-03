import { NavLink } from 'react-router-dom';
import './NavBar.css';

const links = [
  { to: '/', label: 'Home' },
  { to: '/creator', label: 'Creator' },
  { to: '/library', label: 'Library' },
  { to: '/deck-builder', label: 'Deck Builder' },
  { to: '/play', label: 'Play' },
];

export function NavBar() {
  return (
    <nav className="nav-bar">
      <span className="nav-brand">Battle Monsters</span>
      <ul className="nav-links">
        {links.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={to === '/'}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
