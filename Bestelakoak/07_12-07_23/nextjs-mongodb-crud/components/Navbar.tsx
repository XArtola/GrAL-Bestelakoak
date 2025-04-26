import Link from 'next/link';

function Navbar() {
    return (
        <nav className="bg-gray-950 py-5 mb-2">
            <div className='container flex justify-between'>
                <Link href="/">
                <h1 className='text-2xl font-bold'>
                Next Mongo
                </h1>
                </Link>
            </div>
            <ul className='flex gap-x-4'>
                <li>
                    <Link href="/tasks/new">
                    New task
                    </Link>
                </li>
            </ul>
        </nav>
    )
}

export default Navbar;