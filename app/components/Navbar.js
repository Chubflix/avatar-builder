'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar({ onSettingsClick }) {
    const pathname = usePathname();

    return (
        <nav className="nav">
            <div className="nav-content">
                <a href="../" className="nav-brand">Chubflix</a>

                <div className="nav-right">
                    {pathname === '/' ? (
                        <Link
                            href="/character-creator"
                            className={'nav-link'}
                        >
                            Avatar Builder
                        </Link>
                    ) : (
                        <Link
                            href="/"
                            className={'nav-link'}
                        >
                            Character Creator
                        </Link>
                    )}

                    <button
                        className="btn-settings"
                        onClick={onSettingsClick}
                        title="Settings"
                    >
                        <i className="fa fa-cog"></i>
                    </button>
                </div>
            </div>
        </nav>
    );
}