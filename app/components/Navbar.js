'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar({ onSettingsClick, characterId = null }) {
    const pathname = usePathname();

    let query = '';
    if (characterId) {
        query = `?characterId=${characterId}`;
    }

    return (
        <nav className="nav">
            <div className="nav-content">
                <a href="../" className="nav-brand">Chubflix</a>

                <div className="nav-right">
                    {pathname.startsWith('/avatar-builder') ? (
                        <Link
                            href={`/character-creator${query}`}
                            className={'nav-link'}
                        >
                            Avatar Builder
                        </Link>
                    ) : (
                        <Link
                            href={`/avatar-builder${query}`}
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