import { ArticleSection } from '../components/ArticleContent';

export function getArticleContent(slug: string): ArticleSection[] {
  const articleContents: Record<string, ArticleSection[]> = {
    'introduction-to-helium-network': [
      
      {
        type: 'paragraph',
        content: 'Helium is revolutionizing the way we connect devices to the internet, offering a decentralized global network that delivers faster and more affordable connectivity. When Helium first launched, it created an IoT network built on its custom blockchain. Hotspot operators provided wireless coverage and earned HNT tokens using the Proof-of-Coverage (PoC) system. This ensured that the network was being properly maintained and expanded, while LoRaWAN connectivity was offered for IoT devices like smart collars and scooters. The PoC rewards played a key role in building the network, but data transfer rewards have been essential for the long-term sustainability of Helium’s ecosystem.'
      },
      {
        type: 'quote',
        content: 'Helium has engaged Top Ledger as their data analysis partner for both their on-chain as well as oracle data since January 2024.'
      },
      {
        type:'heading',
        level: 2,
        content: 'Transition to Solana and SubDAO Framework'
      },
      {
        type: 'paragraph',
        content: 'Helium has evolved into a network of wireless networks after migrating to the Solana blockchain. This shift has allowed Helium to support multiple wireless networks such as LoRaWAN and 5G-offload, with the flexibility to add more in the future. This new structure makes Helium more scalable and adaptable, positioning it as a decentralized solution for various communication needs.'
      },
      {
        type: 'paragraph',
        content: 'Key milestones:'
      },
      {
        type: 'list',
        items: [
          '**April 2023:** Migration to Solana, with core operations and protocol state on-chain.',
          {
            text: '**SubDAO Framework** (HIPs 51, 52, 53 - Jan 2022):',
            nested: [
              { text: '**Helium IoT:** LoRaWAN connectivity, rewards in IOT tokens.' },
              { text: '**Helium Mobile:** 5G/CBRS connectivity, rewards in MOBILE tokens.' }
            ]
          },
          '**HIP-138 & HIP-141:** Restored unified HNT rewards (via veHNT voting), increasing token utility and streamlining protocol incentives for all participants.'
        ]
      },
      {
        type: 'paragraph',
        content: 'These changes transformed Helium into an ecosystem of communication networks, where each subDAO manages its specific network, issuing its own tokens and controlling its own protocols. The overarching Helium DAO now supports new subnetworks as they join the ecosystem.'
      },
      {
        type: 'paragraph',
        content: 'These changes increase the utility of the HNT token substantially and will streamline the rewarding method across the network.'
      },
      {
        type: 'quote',
        content: 'The current rewards scheme (post-HIP-141) uses a single-token model. All tokens (IOT, MOBILE) are convertible to HNT through protocol mechanics, and rewards across subnetworks settle in HNT with burning, emissions, etc., visible directly on Solana.'
      },
      {
        type: 'chart',
        chartConfig: {
          chartId: 'chart_1749488747133_qpzbhnu',
          title: 'Daily Mobile Rewards',
          description: 'Since 29 January 2025, the mobile rewards have been paid out in terms of HNT.'
        }
      },
      {
        type: 'chart',
        chartConfig: {
          chartId: 'chart_1749489052238_5ig9f2j',
          title: 'Daily IOT Rewards',
          description: 'Since 29 January 2025, the iOT rewards have been paid out in HNT following implementation of HIP 138'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Oracles: Phased-Out, On-Chain Logic Now Dominant'
      },
      
             {
         type: 'list',
         items: [
            {
                text: 'Historical Oracle Usage:',
                nested: [       
                    {text: 'Oracles were once essential for off-chain event validation (PoC, device data) and price feeds, bridging data to on-chain execution.'},
                    {text: '**HIP-70:** Initiated Oracle-based processing for PoC and Data Transfer Accounting.' }
                ]
            }
         ]
       },
       {
         type: 'list',
         items: [
           {
             text: '**What Actually Changed:**',
             nested: [
               {
                 text: '**Post-Solana and HIP-141:**',
                 nested: [
                   { text: 'Oracles no longer play a standalone or protocol-governing role.' },
                   { text: 'Key protocol actions (rewards, supply changes, governance) are enforced by Solana programs.' },
                   { text: 'Device/coverage data, if ingested, is processed for analytics and historical archiving, not for protocol-critical logic.' },
                   { text: 'Price data now comes from Pyth Network feeds on Solana.' }
                 ]
               }
             ]
           },
           '**What Remains:** Occasional off-chain aggregation remains for analytics—NOT for protocol reward or state determination. There is no longer a trusted or managed set of oracle nodes for PoC or accounting.'
         ]
       },
      {
        type: 'divider'
      },
              {
          type: 'heading',
          level: 2,
          content: 'Helium LoRaWAN & IoT Network'
        },
        {
          type: 'list',
          items: [
            'LoRaWAN is managed by the IoT subDAO.',
            'Decentralized LNSs now process device data, further distributing trust and improving network security and resilience.',
            {
              text: '**Proof-of-Coverage (PoC):**',
              nested: [
                { text: 'Hotspots beacon, witnesses confirm signals, and rewards are calculated by protocol logic on-chain.' },
                { text: 'Modern implementation has eliminated the "challenger vs. beaconer" dichotomy; every hotspot acts as its own beaconer.' }
              ]
            }
          ]
        },
        {
          type: 'quote',
          content: 'PoC receipts may be aggregated by third-party software for analytics but rewards and state exist entirely on Solana, not through an oracle bottleneck.'
        },
        {
          type: 'heading',
          level: 3,
          content: 'Rewards Distribution'
        },
        {
          type: 'list',
          items: [
            'Rewards are issued at the end of daily epochs, based on performance in PoC, device data transfer, etc.',
            'The lion\'s share of IOT rewards go to witnesses; MOBILE rewards are skewed toward radio operators.'
          ]
        },
        {
        type: 'image',
        content: 'https://miro.medium.com/v2/resize:fit:1400/format:webp/0*QWS0lm7QG5urqhf-',
        //caption: 'PoC Rewards Distribution'
        },
        {
        type: 'quote',
        content: 'This info-graphic shows the comparison between the old and new models and how the new model has created efficiencies in the system by combining the responsibilities of the challenger and beaconer together into a hotspot with its own beacon.'
        },
      {
        type: 'paragraph',
        content: 'Refrence: [https://docs.helium.com/iot/proof-of-coverage-roadmap](https://docs.helium.com/iot/proof-of-coverage-roadmap)'
      },
      {
        type:'chart',
        chartConfig: {
          chartId: 'chart_1749488352825_7o1unn0',
          title: 'Daily IoT Rewards',
          description: 'in USD'
        }
      },
      {
        type:'quote',
        content: 'Lions’ share of IOT rewards have gone to the witness’ group. Lions’ share of mobile rewards go to the radio rewards. Interesting side note: despite starting late, mobile rewards have already climbed above 60M USD on a cumulative basis to be over the iOT rewards at a cumulative level.'
      },
      {
        type: 'divider'
      },
              {
          type: 'heading',
          level: 2,
          content: 'Helium Mobile: Web3 Telecom'
        },
        {
          type: 'list',
          items: [
            '**Dynamic Coverage Model:** Wi-Fi hotspots, third-party gateways, and seamless roaming onto traditional carrier networks.',
            {
              text: '**Rewards:**',
              nested: [
                { text: 'MOBILE for coverage, mapping (location data sharing), and deploying new hotspots.' },
                { text: 'Discovery Mapping and optional data contributions by users.' }
              ]
            },
            {
              text: '**Coverage & Reward Multipliers:**',
              nested: [
                { text: 'Oracle Hex Boosting: Only for analytics. No longer protocol-critical as of 2025.' },
                { text: 'Service Provider Hex Boosting: Still influences reward targeting, but now fully parameterized on-chain.' }
              ]
            },
            {
              text: '**Proof-of-Coverage (PoC) Updates (June 2024):**',
              nested: [
                { text: 'Only one indoor device per hex earns rewards (prioritizing uptime).' },
                { text: 'Up to three outdoor devices can claim based on signal and online duration.' }
              ]
            }
          ]
        },
      
      {
        type:'chart',
        chartConfig: {
          chartId: 'chart_1749488194332_5cc2crf',
          title: 'Mobile Rewards',
          description: 'In USD'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Helium Network: Data Credits (DCs) Overview'
      },
      {
        type: 'heading',
        level: 3,
        content: 'What are Data Credits (DCs)?'
      },
      {
        type: 'paragraph',
        content: 'DCs are the payment method for all services on the Helium network, including IoT and Mobile data transfers, Hotspot onboarding, and other network-related actions. Each DC is fixed at $0.00001 USD, and the number of DCs generated from burning HNT depends on HNTs market price. DCs are non-transferable but can be delegated for data use.'
      },
              {
          type: 'heading',
          level: 3,
          content: 'Data Credits and Network Pricing'
        },
        {
          type: 'list',
          items: [
            {
              text: '**Data Credits (DCs):** Burned HNT for network services.',
              nested: [
                { text: 'Used for data transfers (billed in 24-byte steps), hotspot onboarding, and location assertions.' },
                { text: 'IoT and Mobile have distinct unit costs (IoT: per-message, Mobile: per-GB).' },
                { text: 'Most Mobile data volume comprises large payloads (100–250GB), showing strong demand.' }
              ]
            }
          ]
        },
      
      {
        type: 'chart',
        chartConfig: {
          chartId: 'chart_1749489327623_av6q9bs',
          title: 'IoT data transfer by payload size',
          description: 'Monthly'
        }
      },
      {
        type: 'chart',
        chartConfig: {
          chartId: 'chart_1749490010662_rac18jk',
          title: 'Mobile data transfer',
          description: 'Monthly'
        }
      },
      {
        type: 'quote',
        content: '24–72 byte payloads make up the majority of the data transfers for iOT.'
      },
      {
        type: 'quote',
        content: '100–250 gigabyte payloads make up the majority of the data transfers in mobile category showing the difference in consumption and data transfer size measurement patterns of the 2 networks.'
      },
      {
        type: 'chart',
        chartConfig: {
          chartId: 'chart_1749492330099_0nkq38d',
          title: 'DC burned for network usage',
          description: 'Monthly'
        }
      },
      {
        type: 'quote',
        content: 'Data credits burnt for mobile transfers have gone from 0 to ~99% in about a year highlighting the astounding growth in the Helium Mobile ecosystem.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'HIP-130: Data-Only MOBILE Hotspots'
      },
      {
        type: 'paragraph',
        content: 'Data-Only Hotspots speed network growth, focusing exclusively on mobile data transfer without on-chain PoC activities, lowering deployment barrier and attracting more telecom carriers.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Subscriber Growth and Blockchain Integration'
      },
      {
        type: 'list',
        items: [
          {
            text: '**NFT-powered Subscriber Management:**',
            nested: [
              { text: 'Every mobile subscriber receives a unique NFT, which acts as a digital certificate for their plan.' },
              { text: 'This has fueled rapid (>150k) subscriber growth and showcases blockchain\'s real-world usability in telecom.' }
            ]
          },
          '**Parabolic Growth:** Consistent outperformance in mobile adoption metrics.'
        ]
      },
      {
        type: 'chart',
        chartConfig: {
          chartId: 'chart_1749491156056_vsudxpt',
          title: 'Mobile Subscriber NFT',
          //description: 'Growth trend of subscribers since launch using NFT-based onboarding'
        }
      },
      {
        type: 'quote',
        content: 'Mobile subscribers have grown parabolically.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Tokenomics: Burn-Mint Equilibrium (BME)'
      },
      {
type:'list',
items: [
  '**HNT Emissions:** 41,400 HNT/day as of 2024–25, halving every two years.',
  '**Net Emissions Cap:** 1,643 HNT/day—excess burns above this threshold are permanently removed from supply.',
  '**HIP-141:** 100% of emissions now go to network participants, enforcing true on-chain supply discipline.'
]
      },
      
      {
        type: 'chart',
        chartConfig: {
          chartId: 'chart_1752748341296_38ro5k7',
          title: 'HNT Emissions',
          //description: 'Daily emissions and net burn trends under the Burn-Mint Equilibrium (BME) system.'
        }
      },
      {
        type: 'heading',
        level: 3,
        content: 'Carrier Offload & Inter-Carrier Roaming'
      },
      {
        type :'list',
        items: [
           
          'Helium’s Carrier Offload Beta lets users from multiple carriers access data via Helium Mobile Hotspots, reducing infrastructure costs and expanding decentralized coverage.',
          '**HIP-129:** All Helium Mobile Hotspots can participate, broadening the network and boosting rewards potential for builders.'
        ]   
      },
      
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Data & Analytics Access'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Top Ledger’s Role:' 
      },
      {
        type: 'list',
        items: [
          'Data analysis for all core on-chain protocol actions, network analytics, and archival device data since Jan 2024.',
          'All major analytics, reward-tracking, and protocol states can be publicly viewed on [Helium public dashboard](https://research.topledger.xyz/projects/helium/)'
        ]
      },
      {
        type : 'paragraph',
        content: 'Helium’s 2025 architecture is now a fully on-chain, Solana-native, multi-network protocol with transparent incentives, real-world growth, and open, accessible analytics. All protocol logic and rewards are enforced on Solana, and the legacy limitations or centralization risks of standalone oracles have been fully eliminated.'
      },
      {
        type: 'divider'
      }
        
    ],
    
  };

  // Return the content for the specific slug, or a default if not found
  return articleContents[slug] || [
    {
      type: 'paragraph',
      content: 'This article is currently being written. Please check back soon for the full content.'
    }
  ];
} 