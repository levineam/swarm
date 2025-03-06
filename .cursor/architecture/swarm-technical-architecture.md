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

### In Progress
- **Public Deployment**: Preparing to deploy the feed generator on Render
- **DID Document Configuration**: Linking our server to the DID in the AT Protocol
- **Algorithm Record Creation**: Registering our feed generator in the ecosystem

## 3. Architecture Overview

### Core Components

#### Client Application
- **Technology**: React/React Native frontend
- **Features**: User interface for viewing feeds, managing communities, user profiles
- **Integration Points**: AT Protocol client libraries, Feed Generator API

#### Feed Generator Service
- **Technology**: Node.js backend with Express
- **Features**: Generates custom feeds based on community membership
- **Design Decision**: Single service hosting multiple algorithms for different communities
- **Integration Points**: AT Protocol firehose, Bluesky API, client application

#### Database
- **Current**: SQLite for development
- **Planned**: PostgreSQL for production deployment
- **Schema**: Supports multiple communities, membership roles, and content categorization

### Data Flow
1. AT Protocol firehose sends real-time posts to feed generator
2. Feed generator filters posts based on community membership and rules
3. Client application authenticates with the feed generator using JWT tokens via Bluesky credentials
4. Client requests feed data from feed generator
5. Users interact with content through the client application

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

### Immediate (Target: March 20, 2025)
1. **Complete Deployment**: Deploy feed generator on Render (~5 developer hours, Render free tier)
2. **Configure DID Document**: Link server URL to DID (~3 developer hours)
3. **Create Algorithm Record**: Register feed in AT Protocol (~2 developer hours)
4. **Test in Production**: Validate real-world functionality (~5 developer hours)

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

---

This document should be updated regularly as implementation progresses and requirements evolve. All stakeholders should refer to this document for alignment on architecture decisions and development priorities. 