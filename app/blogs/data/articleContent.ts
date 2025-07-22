import { ArticleSection } from '../components/ArticleContent';

export function getArticleContent(slug: string): ArticleSection[] {
  const articleContents: Record<string, ArticleSection[]> = {
    'introduction-to-helium-network': [
      
      {
        type: 'paragraph',
        content: 'Helium is revolutionising the way we connect devices to the internet, offering a decentralised global network that delivers faster and more affordable connectivity. When Helium first launched, it created an IoT network built on its custom blockchain. Hotspot operators provided wireless coverage and earned HNT tokens using the Proof-of-Coverage (PoC) system. This ensured that the network was being properly maintained and expanded, while LoRaWAN connectivity was offered for IoT devices like smart collars and scooters. The PoC rewards played a key role in building the network, but data transfer rewards have been essential for the long-term sustainability of Helium’s ecosystem.'
      },
      {
        type: 'quote',
        content: 'Helium has engaged Top Ledger as their data analysis partner for both their on-chain as well as oracle data since January 2024.Transition to Solana and SubDAO Framework.'
      },
      {
        type: 'paragraph',
        content: 'Helium has evolved into a network of wireless networks after migrating to the Solana blockchain. This shift has allowed Helium to support multiple wireless networks such as LoRaWAN and 5G-offload, with the flexibility to add more in the future. This new structure makes Helium more scalable and adaptable, positioning it as a decentralized solution for various communication needs.'
      },
      {
        type: 'paragraph',
        content: 'In January 2022, Helium migrated to a subDAO framework through the approval of HIPs 51, 52, and 53. Two major subDAOs were created:'
      },
      {
        type: 'list',
        items: [
          '**Helium IoT :** This subDAO continued to provide LoRaWAN connectivity, issuing IOT tokens as rewards to network participants.',
          '**Helium Mobile :** This subDAO enabled 5G connectivity through CBRS radio hotspots, rewarding operators with MOBILE tokens.'
        ]
      },
      {
        type: 'paragraph',
        content: 'These changes transformed Helium into an ecosystem of communication networks, where each subDAO manages its specific network, issuing its own tokens and controlling its own protocols. The overarching Helium DAO now supports new subnetworks as they join the ecosystem.'
      },
      {
        type: 'paragraph',
        content: 'Post these changes, HIP-138 has recently been brought in which makes the helium network rewards program return to the HNT tokens as rewards to all networks. This change increases the utility of the HNT token substantially and will streamline the rewarding method across the network.'
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
        content: 'Oracles and Their Role in Helium’s Growth'
      },
      {
        type: 'paragraph',
        content: 'Oracles play a crucial role in improving the efficiency and scalability of the Helium blockchain. With the introduction of HIP 70, Helium migrated key processes like Proof-of-Coverage and Data Transfer Accounting to Oracles. These off-chain servers handle data management and relay information to the Solana blockchain, significantly reducing the burden on the main network. By offloading tasks to Oracles, Helium enhances network speed, reliability, and scalability. Oracles also reduce latency by being placed closer to hotspots, ensuring accurate token rewards and efficient data transfer. This shift allows Helium to expand its operations without being slowed down by on-chain limitations.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Helium LoRaWAN: Powering IoT Devices'
      },
      {
        type: 'paragraph',
        content: 'The LoRaWAN network was the starting point for Helium, designed to connect smart devices that require minimal data, such as smart collars, scooters, and tracking devices. Coverage is provided by decentralized Hotspots, which can be operated by anyone willing to contribute to the network. These hotspot owners earn IOT tokens as rewards.'
      },
      {
        type: 'paragraph',
        content: 'The Helium IoT subNetwork now manages this network, offering a more decentralized system by allowing individuals to operate LoRaWAN Network Servers (LNSs). This decentralization enhances security and performance by distributing control across multiple users rather than relying on a centralized entity. The subNetwork also oversees key operations such as Proof-of-Coverage (PoC), data transfer, and token distribution.'
      },
      
      {
        type: 'heading',
        level: 3,
        content: 'Proof-of-Coverage (PoC): Ensuring Network Trustworthiness'
      },
      {
        type: 'paragraph',
        content: 'The Proof-of-Coverage (PoC) system is a key part of Helium’s network, ensuring that hotspots are providing real wireless coverage. It works through a few important roles:'
      },
      {
        type: 'list',
        items: [
          '**Beaconer:** Hotspots initiate a beacon signal that shares information like its location and signal strength on variable time periods about 4 times a day.',
          '**Witnesses:** Nearby hotspots listen for the beacon and create a PoC receipt to prove the Challengee is providing real coverage.',
          '**Validation:** This receipt is sent to an Oracle for validation and rewards calculation.'
        ]
      },
      { 
        type: 'heading',
        level: 3,
        content: 'How PoC Rewards Are Distributed'
      },
      {
        type: 'paragraph',
        content: 'Rewards are distributed at the end of each 24-hour epoch based on how well each hotspot performed in the Proof-of-Coverage (PoC) process. Reward Units measure the performance of a beacon or witness during PoC activities. The total number of Reward Units is summed at the end of the epoch to determine how many tokens each participant will receive.'
      },
      {
        type: 'paragraph',
        content: 'For simplicity, assuming no tokens are allocated for data transmission, 80% of the tokens are distributed for Proof-of-Coverage (PoC) activities. Of these, 80% go to witnesses, and the remaining 20% go to beaconers.'
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
        content: 'iOT rewards has scaled up to reach a cumulative of more than 53m USD till date highlighting the scale of operations of the iOT ecosystem. The above chart is in terms of USD.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Helium Mobile: Revolutionizing Telecom with Blockchain and 5G'
      },
      {
        type: 'paragraph',
        content:
          'Helium Mobile, launched by Nova Labs, is shaking up the mobile carrier industry with its unique approach to blending nationwide coverage and the Helium 5G network. Originally launched in June 2024 in the USA for CBRS, Helium Mobile now replaces this with coverage using Wi-Fi, rewarding users for participating in the network. By integrating Wi-Fi hotspots and 3rd Party gateways, maintained by individuals or organizations, Helium Mobile introduces a Dynamic Coverage model that allows users to roam seamlessly onto the T-Mobile network where Helium’s coverage is weak. This innovative model allows Helium Mobile to expand faster and more efficiently than traditional telecom models.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Earning Rewards with Helium Mobile'
      },
      {
        type: 'paragraph',
        content: 'Helium Mobile incentivizes its users through the MOBILE rewards system. Users can earn these rewards by:'
      },
      {
        type: 'list',
        items: [
          '**Discovery Mapping:** Passively sharing their location data, which helps Helium understand where users are accessing the network.',
          '**Deploying Hotspots:** Providing network coverage in specific incentivized areas using mobile hotspots.'
        ]
      },
      {
        type: 'paragraph',
        content:
          'The use of Discovery Mapping allows subscribers to share their location, motion data, and wallet public key via the Helium Mobile app, earning rewards for contributing to network insights. Participation is optional for paid network plans, and users can opt in or out anytime, offering full control over their data.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Optimizing Coverage and Rewards with the Helium Mobile Coverage Planner'
      },
      {
        type: 'paragraph',
        content:
          'Helium Mobile also provides a powerful tool called the Helium Mobile Coverage Planner, which helps users maximize coverage and rewards by optimizing the placement of their hotspots and radios. Rewards are determined by how useful the coverage is in various areas, referred to as hexes.'
      },
      {
        type: 'paragraph',
        content:
          'Two types of Reward Multipliers affect how rewards are distributed:'
      },
      {
        type: 'list',
        items: [
          '**Oracle Hex Boosting:** This uses data from Urbanization, Footfall, and Land Type oracles to determine the value of a hex.',
          '**Service Provider Hex Boosting:** Applied by service providers, this boosts specific hexes with reward multipliers. After the Service Provider Hex Boosting period ends, the Oracle Reward Multiplier becomes active.'
        ]
      },
      {
        type: 'heading',
        level: 3,
        content: 'Proof-of-Coverage (PoC) and Updated Rules'
      },
      {
        type: 'paragraph',
        content:
          'As of June 12, 2024, Helium Mobile updated its Proof-of-Coverage (PoC) rules, changing how Wi-Fi Hotspots earn rewards in overlapping coverage areas. For indoor hotspots, only one device can earn rewards in a given location, with priority going to the hotspot that has been online the longest. For outdoor hotspots, up to three devices can earn rewards based on their signal strength and online duration.'
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
        type: 'quote',
        content: 'Mobile rewards has dramatically scaled up to reach a cumulative of more than 54m USD till date eclipsing the iOT rewards despite having started later showing the rapid scale up of the mobile ecosystem for Helium.'
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
        content: 'DCs are the payment method for all services on the Helium network, including IoT and Mobile data transfers, Hotspot onboarding, and other network-related actions. Each DC is fixed at $0.00001 USD, and the number of DCs generated from burning HNT depends on HNT’s market price. DCs are non-transferable but can be delegated for data use.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Helium IoT Network Pricing'
      },
      {
        type: 'paragraph',
        content: 'DCs are primarily used for data transfer, billed in 24-byte increments per message. If users request multiple copies of the same message, each additional copy incurs an extra charge.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Helium Mobile Network Pricing'
      },
      {
        type: 'paragraph',
        content: 'Unlike IoT, the Helium Mobile Network charges data at $0.50 per gigabyte, ensuring a competitive rate while rewarding Mobile Hotspot operators.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Other Uses of DCs'
      },
      {
        type: 'paragraph',
        content: 'DCs are also required for onboarding and asserting Hotspot locations. A cost calculator helps users estimate expenses based on device count and message frequency, ensuring transparent and predictable pricing.'
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
        content: 'Introducing Data-Only MOBILE Hotspots: HIP 130'
      },
      {
        type: 'paragraph',
        content: 'Helium Improvement Proposal 130 (HIP 130) proposed Data-Only MOBILE Hotspots to further expand the Helium network quickly and cost-effectively. Unlike traditional hotspots, these Data-Only hotspots focus solely on transferring mobile data and do not participate in Proof-of-Coverage activities, making them faster and easier to deploy. This initiative is expected to attract more telecom carriers, increase data traffic, and create more earning opportunities for hotspot owners and network builders. By leveraging existing Wi-Fi infrastructure, builders can expand the network without additional hardware, accelerating Helium’s growth.'
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
        type: 'paragraph',
        content: 'Helium Mobile’s innovative approach to subscriber management using NFTs (non-fungible tokens) has helped it surpass 116.8k subscribers demonstrating growing trust in blockchain-based services. Each new subscriber receives a unique NFT that acts as a secure, digital certificate of their phone plan subscription. This blockchain-based method is transparent, verifiable, and sets a new standard for subscriber management in the telecom industry.'
      },
      {
        type: 'paragraph',
        content: 'The achievement of surpassing 150k subscribers highlights not only Helium Mobile’s scalability but also the increasing acceptance of digital assets and blockchain technology in everyday services. This milestone positions Helium Mobile as a leader in the shift toward decentralized, Web3-based telecom solutions.'
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
        content: 'Understanding Helium’s Tokenomics'
      },
      {
        type: 'paragraph',
        content: 'Helium’s Burn-Mint Equilibrium (BME) system controls how HNT tokens are minted and burned. The network mints a fixed amount of HNT each day, with emissions halving every two years. In 2024–2025, around 41,400 HNT is minted daily, and since the implementation of HIP-141 100% is going to network activity participants.'
      },
      {
        type: 'paragraph',
        content: 'There is a cap called the net emissions cap, set at 1,643 HNT per day. If less than this amount is burned, the full amount burned is re-minted. If more is burned, anything above 1,643 HNT is permanently removed from the supply.'
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
        type: 'quote',
        content: 'HNT emissions for the Mobile treasury flipped the IoT treasury in January 2024, after which they have been consistently higher than those for the IoT treasury.'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Helium Network’s Carrier Offload'
      },
      {
        type: 'paragraph',
        content: 'The Helium Network is leading the way in decentralizing telecommunications by allowing subscribers from multiple carriers to connect and transfer data through Helium Mobile Hotspots via the Carrier Offload Beta. Traditionally, telecom companies rely on expensive centralized infrastructure, but Helium’s decentralized network allows individuals to share data, reducing costs for carriers. This helps carriers maintain reliable service and expand coverage without heavy investment in infrastructure.'
      },
      {
        type: 'paragraph',
        content: 'In the Carrier Offload Beta, coverage provided by Helium Mobile Hotspots can also be used by other carriers’ subscribers, increasing potential rewards for hotspot builders. This shift could redefine telecom industry standards by showing the viability of decentralized networks. With the approval of HIP 129, all Helium Mobile Hotspots are now eligible to participate in the beta, helping expand the network and reduce data costs for carriers.'
      },
      {
        type: 'paragraph',
        content: 'Detailed stats: [Public dashboard](https://research.topledger.xyz/projects/helium/)'
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