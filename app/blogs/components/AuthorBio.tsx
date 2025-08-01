"use client";

interface AuthorBioProps {
  author: string;
}

export default function AuthorBio({ author }: AuthorBioProps) {
  // Sample author data - in a real app this would come from a database
  const getAuthorData = (authorName: string) => {
    const authors = {
      'Soham': {
        name: 'Soham Agarwal',
        bio: 'Product, Top Ledger',
        avatar: '',
        social: {
          x: '@sohamska',
          //linkedin: 'oxlchigo',
        },
        followers: undefined
      },
      'Decal': {
        name: 'Decal',
        bio: 'Developer advocate and technical writer focused on Solana development tools and frameworks. Building the next generation of web3 applications.',
        avatar: '',
        social: {
          x: '@decal_dev',
          github: 'decal',
        },
        followers: '1.8K'
      },
      'Helius Team': {
        name: 'Helius Team',
        bio: 'The team behind Helius - providing the infrastructure and tools developers need to build on Solana. Committed to making web3 accessible to everyone.',
        avatar: '',
        social: {
          x: '@helius_labs',
          website: 'helius.xyz',
        },
        followers: '15.2K'
      }
    } as const;
    
    return authors[authorName as keyof typeof authors] || {
      name: authorName,
      bio: 'Content creator and blockchain enthusiast.',
      avatar: '',
      social: {} as any,
      followers: undefined
    };
  };

  const authorData = getAuthorData(author);

  return (
    <div className="border-t border-b border-gray-900 py-8 my-12">
      {/* Author Section */}
      <div className="flex items-center gap-6">
        {/* Author Avatar */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-white">
            {authorData.name.charAt(0)}
          </span>
        </div>
        
        {/* Author Info */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-xl font-bold text-white">{authorData.name}</h3>
            {authorData.followers && (
              <span className="text-sm text-gray-500">{authorData.followers} followers</span>
            )}
          </div>
          
          <p className="text-gray-300 leading-relaxed mb-4">
            {authorData.bio}
          </p>
          
                     {/* Social Links */}
           <div className="flex items-center gap-4">
             {(authorData.social as any).x && (
              <a
                                 href={`https://x.com/${(authorData.social as any).x.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-sm">Follow</span>
              </a>
            )}
            
                         {(authorData.social as any).linkedin && (
              <a
                                 href={`https://linkedin.com/in/${(authorData.social as any).linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-sm">LinkedIn</span>
              </a>
            )}
            
                         {(authorData.social as any).github && (
              <a
                                 href={`https://github.com/${(authorData.social as any).github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm">GitHub</span>
              </a>
            )}
            
                         {(authorData.social as any).website && (
              <a
                                 href={`https://${(authorData.social as any).website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
                <span className="text-sm">Website</span>
              </a>
            )}
          </div>
        </div>
        
        {/* Follow Top Ledger Button - Desktop Only */}
        <div className="hidden md:flex items-center">
          <a
            href="https://x.com/ledger_top"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-sm font-medium">Follow Top Ledger</span>
          </a>
        </div>
      </div>
      
      {/* Follow Top Ledger Button - Mobile Only */}
      <div className="md:hidden mt-6 pt-6 border-t border-gray-800/50">
        <a
          href="https://x.com/ledger_top"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="text-sm font-medium">Follow Top Ledger</span>
        </a>
      </div>
    </div>
  );
} 