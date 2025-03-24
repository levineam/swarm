<!-- 
This document defines the overall technical architecture for the Swarm Community Platform.
Reference this document when implementing new features to ensure alignment with the architecture.

IMPORTANT: This document should be updated whenever architectural decisions are made or changed.
All significant modifications to the system design, data models, or component interactions
should be reflected here to maintain it as the authoritative reference.
-->

# Swarm Community Platform: Technical Architecture & Implementation Plan

This document serves as a high-level technical specification and roadmap for the Swarm Community Platform. It outlines the architectural decisions, implementation progress, and future development plans for stakeholders, developers, and community members. This document should be maintained as a living reference throughout development.

## 1. Executive Summary

The Swarm Community Platform aims to create a decentralized social experience on the AT Protocol (Bluesky) that enables:

1. A unified "Swarm" community feed showcasing content from all community members
2. User-created subcommunities with controlled membership
3. Custom feed generation for specialized interest groups
4. Integration with the broader Bluesky ecosystem, including authentication via Bluesky credentials, content sharing across Bluesky communities, and adherence to AT Protocol API standards

We've established the foundational infrastructure and are now ready to expand into a fully-featured community platform.

## 2. Current Implementation Status

### Completed
- **Bluesky Integration**: Successfully integrated with the AT Protocol and Bluesky API
- **Account Setup**: Established a Bluesky account (andrarchy.bsky.social) for feed generation
- **DID Generation**: Created a unique decentralized identifier (did:plc:ouadmsyvsfcpkxg3yyz4trqi)
- **Feed Generator Structure**: Implemented the core feed generator with:
  - Community member identification
  - Post filtering logic
  - Database integration
  - AT Protocol firehose subscription
- **Deployment Configuration**: Created configuration for Render deployment with HTTPS
- **Public Deployment**: Deployed the feed generator on Render at https://swarm-feed-generator.onrender.com
- **DID Document Configuration**: Successfully linked our server to the DID in the AT Protocol
- **Algorithm Record Creation**: Registered our feed generator with URI at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community
- **Client Integration**: Updated client application to use the new feed URI
- **Testing Framework**: Created comprehensive testing documentation and procedures
- **Landing Page**: Implemented a user-friendly landing page for the feed generator
- **XRPC Endpoints**: Successfully implemented and tested all required XRPC endpoints
- **DID Resolution**: Fixed issues with DID resolution by updating the service type and ID
- **Domain Usage Guidelines**: Established clear guidelines for using the correct domains across the codebase
- **Client-Feed Generator Connection**: Successfully resolved the "could not resolve identity" error, enabling the client application to properly connect to the feed generator

### Implementation Challenges and Solutions
For detailed notes on implementation challenges, solutions, and lessons learned during the feed generator development, refer to [Feed Generator Implementation Notes](./feed-generator-implementation-notes.md). This document captures the technical details and troubleshooting steps that were necessary to successfully deploy the feed generator in production.

#### Recent Challenges and Solutions

1. **Feed Indexing Issues**: We encountered persistent issues with posts not appearing in the Swarm Community feed despite being correctly indexed in the database.
   - **Root Causes**: Service hibernation on Render's free tier, non-persistent database storage, and issues with the feed algorithm not properly filtering posts.
   - **Solutions**: 
     - Implemented an admin endpoint (`/admin/update-feed`) for manually adding posts to the feed
     - Created diagnostic scripts to check feed health and database status
     - Upgraded to a paid tier on Render to eliminate hibernation and database persistence issues
     - Implemented a GitHub Actions workflow to run the `auto-add-community-posts.js` script hourly

2. **Service Reliability**: The feed generator service was experiencing intermittent issues due to Render's free tier limitations.
   - **Root Causes**: Service hibernation after 15 minutes of inactivity, non-persistent storage between service restarts.
   - **Solutions**:
     - Upgraded to a paid tier on Render, which provides 24/7 uptime and persistent storage
     - Created maintenance scripts to monitor service health and automatically restart if needed
     - Implemented comprehensive error handling and logging

3. **CORS and API Access Issues**: The client application had difficulty accessing the feed generator API due to CORS restrictions and hydration challenges.
   - **Root Causes**: Cross-origin restrictions when accessing the feed generator from the client application, and issues with post hydration.
   - **Solutions**:
     - Implemented a dedicated CORS proxy at https://swarm-cors-proxy.onrender.com with comprehensive header handling
     - Developed a direct API access implementation that bypasses problematic proxies when necessary
     - Created a custom `SwarmFeedAPI` class to handle feed data retrieval and hydration
     - Enhanced error handling and diagnostics to better trace and resolve issues

These improvements have significantly enhanced the reliability and functionality of the Swarm Community Platform, ensuring a better user experience for community members.

## 3. Architecture Overview

### Core Components

#### Client Application
- **Technology**: React/React Native frontend
- **Features**: User interface for viewing feeds, managing communities, user profiles
- **Integration Points**: AT Protocol client libraries, Feed Generator API
- **Deployment**: Hosted on Render at https://swarm-social.onrender.com

#### Feed Generator Service
- **Technology**: Node.js backend with Express
- **Features**: Generates custom feeds based on community membership
- **Design Decision**: Single service hosting multiple algorithms for different communities
- **Integration Points**: AT Protocol firehose, Bluesky API, client application
- **Deployment**: Hosted on Render at https://swarm-feed-generator.onrender.com
- **Feed URI**: at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community
- **Technical Implementation**: See [Feed Generator Implementation Notes](./feed-generator-implementation-notes.md) for detailed implementation information, including DID document configuration, build process, and deployment considerations.

#### Database
- **Current**: SQLite for development
- **Planned**: PostgreSQL for production deployment
- **Schema**: Supports multiple communities, membership roles, and content categorization

### Data Flow
1. AT Protocol firehose sends real-time posts to feed generator
2. Feed generator filters posts based on community membership and rules
3. Client application authenticates with the feed generator using JWT tokens via Bluesky credentials
4. Client requests feed data from feed generator either directly or through the CORS proxy when needed
5. Custom `SwarmFeedAPI` handles post hydration and data processing
6. Users interact with content through the client application

### Domain Architecture
The Swarm platform consists of two separate services with distinct domains:

1. **Client Application**: https://swarm-social.onrender.com
   - Provides the user interface for interacting with the Swarm community
   - References to the main Swarm web application use this domain

2. **Feed Generator Service**: https://swarm-feed-generator.onrender.com
   - Implements the AT Protocol feed generator specification
   - All feed generator service endpoints use this domain
   - The DID document and service references use this domain

This separation ensures proper functionality while maintaining a clear distinction between the client and service components.

## 4. Community Management System

### Membership Control
- **Policies**: Community owners define membership policies (open, invite-only, approval-required)
- **Join Process**: Users join via public registration (open), invite codes (invite-only), or submitting requests for admin approval (approval-required)
- **Permissions**: Role-based system (member, moderator, admin)
- **Tracking**: Member status (active, pending, banned)

### Database Schema
```
Communities:
  - id (primary key)
  - name
  - description
  - creator_did
  - membership_type
  - created_at

CommunityMembers:
  - community_id (foreign key)
  - member_did
  - role
  - status
  - joined_at
```

## 5. Next Steps

### Immediate (Completed)
1. ✅ **Complete Deployment**: Deployed feed generator on Render
2. ✅ **Configure DID Document**: Linked server URL to DID
3. ✅ **Create Algorithm Record**: Registered feed in AT Protocol
4. ✅ **Test in Production**: Created testing framework for validating real-world functionality

### Short-Term (Target: April 20–May 20, 2025)
1. **Implement Community Management System**: Database schema and API endpoints (~20 developer hours)
2. **Develop Admin Interface**: For managing communities and membership (~25 developer hours)
3. **Enhance Client Integration**: Update client to support multiple feeds (~15 developer hours)

### Long-Term (Target: June 20–September 20, 2025)
1. **Scale Infrastructure**: Move to PostgreSQL, implement caching (~30 developer hours, $10/month hosting)
2. **Add Content Discovery**: Help users find relevant communities (~20 developer hours)
3. **Develop Moderation Tools**: Content filtering and reporting (~25 developer hours)
4. **Analytics Integration**: Community growth and engagement metrics (~20 developer hours)

## 6. Technical Considerations

### Scalability
- Design for horizontal scaling of feed generator
- Implement efficient database queries and indexing
- Consider caching layer for popular feeds and membership checks

### Security
- JWT authentication for all API endpoints
- Secure storage of credentials and tokens in environment variables
- Proper permission checks for community management actions

### Compatibility
- Maintain compliance with AT Protocol specifications
- Support future Bluesky API changes
- Ensure backward compatibility for client applications

### Data Privacy
- Community membership lists are private by default, visible only to admins and moderators unless explicitly set public by community owners
- User data processed minimally, adhering to decentralized privacy norms

## 7. Conclusion

The Swarm Community Platform represents a significant enhancement to the Bluesky ecosystem by enabling user-controlled communities with custom feeds. Our current implementation provides a solid foundation, and our planned enhancements will create a robust platform for decentralized community building.

By maintaining a single feed generator service with support for multiple algorithms, we can efficiently manage resources while still providing flexible community creation and membership control. This architecture positions us for both immediate functionality and long-term growth.

## 8. Lessons Learned

### Technical Insights
- **AT Protocol Evolution**: The protocol has evolved to handle DID document updates automatically when creating algorithm records
- **Feed Generation Performance**: Current implementation works well for small to medium communities, but will need optimization for larger scale
- **Token Management**: Access tokens require regular renewal; a token refresh mechanism will be needed for production
- **DID and Identity Configuration**: Working with DIDs and the AT Protocol required careful attention to detail and multiple iterations to get right. See [Feed Generator Implementation Notes](./feed-generator-implementation-notes.md) for detailed lessons learned.
- **Domain Separation**: Maintaining clear separation between the client application domain (swarm-social.onrender.com) and the feed generator service domain (swarm-feed-generator.onrender.com) is crucial for proper functionality.
- **DID Document Structure**: The AT Protocol has specific requirements for DID document structure, including service types ("BskyFeedGenerator") and service IDs ("#bsky_fg").
- **Deployment Environment Variables**: Consistent environment variables across development and production environments are essential for proper service configuration.
- **CORS Handling**: CORS issues between client and feed generator required a dedicated proxy solution, highlighting the importance of cross-origin considerations in distributed architecture.
- **Direct vs. Proxied Access**: A hybrid approach of direct API access with custom hydration provides the best reliability, bypassing proxy-related issues while maintaining functionality.

### Implementation Approach
- **Modular Design**: The separation of feed generator logic from client application provides flexibility
- **Documentation-First**: Creating comprehensive documentation before and during implementation improved clarity
- **Incremental Testing**: Testing each component individually before integration reduced debugging time
- **Systematic Domain Management**: When managing multiple domains, a systematic approach to updating references is necessary to ensure consistency
- **Redundant Solutions**: Implementing multiple layers of redundancy for critical components (like DID document serving) provides resilience against unexpected issues

---

This document should be updated regularly as implementation progresses and requirements evolve. All stakeholders should refer to this document for alignment on architecture decisions and development priorities. 