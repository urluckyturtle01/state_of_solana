import { ArticleSection } from '../components/ArticleContent';

export function getArticleContent(slug: string): ArticleSection[] {
  const articleContents: Record<string, ArticleSection[]> = {
'introduction-to-helium-network': [
      
      {
        type: 'paragraph',
        content: 'Helium is a global, decentralized network enabling individuals and organizations to build and operate wireless infrastructure for mobile cellular traffic and the Internet of Things (IoT). Participants deploy Hotspots—plug-and-play devices that act as miniature cell towers—to provide coverage and earn HNT rewards. The Helium Network offers a new approach to connectivity by distributing infrastructure ownership and incentivizing participation, resulting in a model that is more cost-effective and community-driven than the traditional telecom industry.'
      },
      {
        type: 'quote',
        content: 'Helium has engaged Top Ledger as their data analysis partner for both their on-chain as well as oracle data since January 2024.'
      },
      {
        type: 'divider'
      },
      
      {
        type: 'heading',
        level: 2,
        content: 'Use Cases'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Mobile Coverage'
      },
      {
        type: 'paragraph',
        content: '[Helium Mobile](https://heliummobile.com/) is a U.S.-based mobile carrier (MVNO) that combines the Helium Network’s decentralized mobile coverage with nationwide 5G. This hybrid model enables broader coverage while dramatically reducing infrastructure deployment costs.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Telecom Partnerships'
      },
      {
        type: 'paragraph',
        content: 'Major providers like [AT&T](https://www.fierce-network.com/newswire/att-partners-helium-better-wi-fi-offload) now use the Helium Network for offloading user data in high-traffic venues (urban centers, stadiums), leveraging decentralized infrastructure for efficient scaling.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Enterprise Deployments'
      },
      {
        type: 'paragraph',
        content: 'Individuals and businesses can easily extend Helium Network coverage via existing Wi-Fi equipment (Ubiquiti, Aruba, Cisco Meraki, Ruckus, etc.). Deployments in malls, campuses, and offices can enable automatic mobile device connections, earning token rewards for supporting network usage.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'IoT Applications'
      },
      {
        type: 'paragraph',
        content: 'Helium supports a diversity of sensor-based use-cases (asset tracking, environmental monitoring, agriculture, flood detection), leveraging decentralized LoRaWAN coverage for cost-effective data backhaul.'
      },
      {
        type: 'divider'
      },
      {
        type:'heading',
        level: 2,
        content: 'Helium’s Network Structure: SubDAOs & Migration'
      },
      {
        type: 'paragraph',
        content: 'Following approval of HIPs 51, 52, and 53 in Jan 2022, Helium migrated to a subDAO framework alongside its transition to the Solana blockchain in April 2023. This enabled Helium to support multiple wireless networks, namely:'
      },
      
      {
        type: 'list',
        items: [
          '**Mobile Network:** Decentralized mobile connectivity (cellular and Wi-Fi coverage), previously rewarded in the MOBILE token.',
          
          '**IoT Network:** Decentralized LoRaWAN infrastructure for IoT use-cases, previously rewarded in the IOT token.'
        ]
      },
      {
        type: 'paragraph',
        content: 'As of January 2025 (HIP-138, HIP-141), all rewards for both Mobile and IoT Networks are now denominated in HNT. This streamlines network economics, aligns incentives, and increases HNT utility across the ecosystem.'
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
        type: 'quote',
        content: 'As of January 2025, all network rewards are paid out in HNT, not IOT or MOBILE tokens.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Mobile Network (Cellular/Wi-Fi Coverage, HNT Rewards)'
      },
      {
        type: 'paragraph',
        content: 'The Mobile Network on Helium enables decentralized cellular connectivity using distributed Hotspots (mini cell towers/Wi-Fi APs). Network participants provide coverage and receive HNT rewards proportional to their contribution. Helium Mobile (the consumer MVNO service) leverages the Mobile Network’s decentralized infrastructure to offer users mobile coverage, with seamless fallback to national carriers when Helium coverage is insufficient.'
      },
      {
        type: 'list',
        items: [
          '"Daily HNT rewards to Mobile Network" (now all HNT post-Jan 2025)'
        ]
      },
      {
        type: 'quote',
        content: 'For charts labeled “Mobile rewards”: these represent HNT rewards post-Jan 2025.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'IoT Network (LoRaWAN Coverage, HNT Rewards)'
      },
      {
        type: 'paragraph',
        content: 'The IoT Network provides global LoRaWAN data connectivity for low-cost, low-power devices. Anyone can deploy Hotspots to extend coverage, participating in Proof-of-Coverage and Data Transfer activities.'
      },
      {
        type: 'list',
        items: [
          '"Daily HNT rewards to IoT Network" (now all HNT post-Jan 2025)',
          'Note: For charts labeled “IoT rewards”: these represent HNT rewards post-Jan 2025.'
        ]
      },
      {
        type: 'paragraph',
        content: 'Reference: [Proof-of-Coverage Roadmap](https://docs.helium.com/iot/proof-of-coverage-roadmap/)'
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
        type: 'quote',
        content: 'As of January 2025, all network rewards are paid out in HNT, not IOT or MOBILE tokens.'
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
        content: 'Data Credits (DCs): The Billing Backbone.'
      },
      
      {
        type: 'paragraph',
        content: 'Helium leverages Data Credits (DCs) as a metered billing token for all network usage across both the IoT and Mobile Networks.'
      },
      {
        type: 'list',
        items: [
          '**IoT Network:** Data transfer costs $0.00001 per 24-byte message.',
          '**Mobile Network:** Data transfer costs $0.50 per 1GB (50,000 DCs).'
        ]
      },
      {
        type: 'paragraph',
        content: 'All DCs are created by burning HNT—tying real-world usage directly to token demand and supply.'
      },
      {
        type: 'paragraph',
        content: 'More background: [How Data Credits Work](https://docs.helium.com/tokens/data-credit/)'
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
  'As of Jan 29, 2025, network emissions are 41,095 HNT/day; after the Aug 1, 2025 biannual halving, emissions become 20,548 HNT/day.',
  '**Net Emissions Cap:** 1,643 HNT/day – HNT burns above this threshold are permanently removed from supply. Burns below are re-emitted.',
  'Scheduled HNT emissions to Mobile/IoT treasuries ceased Jan 29, 2025; all HNT is now emitted directly to network participants (HIP-141)'
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
        type: 'divider'
      },
      {
          type: 'heading',
          level: 2,
          content: 'Proof-of-Coverage: Network Trust'
        },
        {
          type: 'paragraph',
          content: 'The network validates coverage via Proof-of-Coverage (PoC), where Hotspots beacon, other Hotspots witness, consensus is determined, and rewards (now HNT) are distributed according to performance in these protocols.'
        },
        {
          type: 'paragraph',
          content: '(Any previous reward splits in IOT/MOBILE tokens are obsolete. All rewards in HNT from Jan 2025.)'
        },
        {
          type: 'heading',
          level: 2,
          content: 'Subscriber Growth & Blockchain Integration'
        },
        {
          type: 'divider'
        },
        {
          type: 'paragraph',
          content: 'Subscribers to Helium Mobile receive NFTs as proof of membership, an innovative use of blockchain for telco “digital certificates.”'
        },
        {
          type: 'paragraph',
          content: 'Subscriber growth for Helium Mobile (the consumer brand) is distinct from that of the Mobile Network (the underlying decentralized infrastructure).'
        },
        {
          type: 'divider'
        },
        {
          type: 'heading',
          level: 2,
          content: 'Recent Developments / News'
        },
        {
          type: 'list',
          items: [
            '[AT&T partners with Helium for Wi-Fi offload](https://www.fierce-network.com/newswire/att-partners-helium-better-wi-fi-offload)',
            '[Telefónica brings Helium Network to Mexico](https://www.telefonica.com/en/communication-room/press-room/telefonica-mexico-bringing-helium-network-2-million-subscribers-mexico/)',
            '[Helium Mobile launches first-ever free phone plan](https://www.bgr.com/tech/helium-mobile-launched-the-first-ever-free-phone-plan-with-5g-data-and-voice-for-0/)'
          ]
        },
        {
          type: 'divider'
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
    'hjbjh': [
      {
        type: 'paragraph',
        content: 'kjnjknjk'
      },
      {
        type: 'heading',
        level: 3,
        content: 'hbjhnjjk'
      },
      {
        type: 'quote',
        content: 'kjbjkbjkbjk'
      },
      {
        type: 'divider'
      },
      {
        type: 'divider'
      },
      {
        type: 'list',
        items: [{
                    text: 'hbjhbj',
                    nested: [{
                    text: 'kjnjknkj',
                    nested: []
                  }, {
                    text: 'knlknln',
                    nested: []
                  }, {
                    text: 'kjnkn',
                    nested: []
                  }]
                  }, {
                    text: 'kjbjkn',
                    nested: []
                  }, {
                    text: 'ljnjk',
                    nested: []
                  }]
      },
      {
        type: 'chart',
        chartConfig: {
          chartId: 'chart_1748087042364_phdzeam',
          title: 'Account Bytes Vs Data Bytes',
          description: 'Solana\'s max transaction size is 1232 bytes'
        }
      }
    ]
  };

  // Return the content for the specific slug, or a default if not found
  return articleContents[slug] || [
    {
      type: 'paragraph',
      content: 'This article is currently being written. Please check back soon for the full content.'
    }
  ];
} 