export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  image: string;
  slug: string;
  readTime?: string;
  company?: {
    name: string;
    handle: string; // Twitter handle without @
  };
}

export const sampleBlogPosts: BlogPost[] = [{
    id: '1',
    title: 'Introduction to the Helium Network',
    excerpt: 'How Helium is building a decentralized, scalable wireless network with IoT, 5G, and blockchain-powered rewards.',
    author: 'Soham',
    date: 'JUL 22, 2025',
    category: 'depin',
    image: 'https://research.topledger.xyz/helium-card.png',
    slug: 'introduction-to-helium-network',
    readTime: '8 min read',
    company: {
      name: 'Helium',
      handle: 'helium'
    }
  },
  {
    id: '1753478115424',
    title: 'hjbjh',
    excerpt: 'hb jbn ',
    author: 'lokesh',
    date: 'JUL 26, 2025',
    category: 'defi',
    image: '',
    slug: 'hjbjh',
    readTime: '5 min read',
    company: {
      name: 'tl',
      handle: '@tol'
    }
  }
];

export const featuredPost: BlogPost = sampleBlogPosts[0]; 