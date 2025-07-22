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
}

export const sampleBlogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Introduction to the Helium Network',
    excerpt: 'How Helium is building a decentralized, scalable wireless network with IoT, 5G, and blockchain-powered rewards.',
    author: 'Soham',
    date: 'JUL 22, 2025',
    category: 'depin',
    image: 'https://99bitcoins.com/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Monochromatic-New-York-City-Lifestyle-Quote-Facebook-Cover-2024-04-30T110613.103-1024x666.jpg',
    slug: 'introduction-to-helium-network',
    readTime: '8 min read'
  }
];

export const featuredPost: BlogPost = sampleBlogPosts[0]; 