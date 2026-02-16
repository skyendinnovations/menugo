``` mermaid
erDiagram
    user ||--o{ session : "has"
    user ||--o{ account : "has"
    user ||--o{ restaurant_members : "member of"
    user ||--o{ user_roles : "has"
    user ||--o{ restaurant_invitations : "invited by"
    user ||--o{ restaurant_invitations : "accepted by"
    user ||--o{ table_sessions : "ended by"
    
    restaurants ||--o{ restaurant_members : "has"
    restaurants ||--o{ roles : "defines"
    restaurants ||--o{ restaurant_invitations : "invites to"
    restaurants ||--o{ restaurant_tables : "has"
    restaurants ||--o{ menu_categories : "has"
    restaurants ||--o{ table_sessions : "hosts"
    restaurants ||--o{ user_roles : "scopes"
    
    roles ||--o{ user_roles : "assigned to"
    
    restaurant_members }o--|| user : "belongs to"
    restaurant_members }o--|| restaurants : "member of"
    
    user_roles }o--|| user : "assigned to"
    user_roles }o--|| roles : "uses"
    user_roles }o--|| restaurants : "scoped to"
    
    restaurant_invitations }o--|| restaurants : "for"
    restaurant_invitations }o--|| user : "invited by"
    restaurant_invitations }o--|| user : "accepted by"
    
    restaurant_tables ||--o{ table_sessions : "used in"
    restaurant_tables }o--|| restaurants : "belongs to"
    
    table_sessions ||--o{ session_participants : "has"
    table_sessions ||--o{ orders : "contains"
    table_sessions }o--|| restaurant_tables : "uses"
    table_sessions }o--|| restaurants : "in"
    
    orders ||--o{ order_items : "contains"
    orders }o--|| table_sessions : "part of"
    orders }o--|| menu_items : "orders"
    
    menu_items }o--|| menu_categories : "categorized in"
    menu_categories }o--|| restaurants : "belongs to"
    
    user {
        text id PK
        text name
        text email UK
        boolean email_verified
        text image
        boolean banned
        text role
        boolean is_super_admin
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    restaurants {
        serial id PK
        text name
        text slug UK
        text description
        text address
        text phone
        text email
        text website
        text logo
        enum table_count_range "under_10|10_to_20|20_to_40|40_to_50"
        integer workers_count
        integer seating_capacity
        jsonb workflow_settings
        jsonb operating_hours
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    restaurant_members {
        serial id PK
        integer restaurant_id FK
        text user_id FK
        boolean is_owner
        boolean is_active
        timestamp joined_at
        timestamp created_at
        timestamp updated_at
    }
    
    roles {
        serial id PK
        integer restaurant_id FK
        text name
        jsonb permissions
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    user_roles {
        serial id PK
        text user_id FK
        integer role_id FK
        integer restaurant_id FK
        timestamp assigned_at
        timestamp created_at
    }
    
    restaurant_invitations {
        serial id PK
        integer restaurant_id FK
        integer[] role_ids
        text email
        text token UK
        text inviter_id FK
        text accepted_by_user_id FK
        timestamp accepted_at
        enum status "pending|accepted|rejected|expired"
        timestamp sent_at
        integer resent_count
        timestamp last_resent_at
        timestamp expires_at
        timestamp created_at
    }
    
    session {
        text id PK
        timestamp expires_at
        text token UK
        timestamp created_at
        timestamp updated_at
        text ip_address
        text user_agent
        text user_id FK
    }
    
    account {
        text id PK
        text account_id
        text provider_id
        text user_id FK
        text access_token
        text refresh_token
        text id_token
        timestamp access_token_expires_at
        timestamp refresh_token_expires_at
        text scope
        text password
        timestamp created_at
        timestamp updated_at
    }
    
    restaurant_tables {
        serial id PK
        integer restaurant_id FK
        text table_number
        integer capacity
        text qr_code UK
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    table_sessions {
        serial id PK
        integer restaurant_id FK
        integer table_id FK
        text join_code
        text host_device_id
        integer persons_count
        enum status "active|closed|cancelled"
        decimal calculated_total
        text ended_by FK
        timestamp start_time
        timestamp end_time
        timestamp updated_at
    }
    
    session_participants {
        serial id PK
        integer session_id FK
        text device_id
        text user_id FK
        text participant_name
        enum status "active|left|removed"
        timestamp joined_at
        timestamp left_at
    }
    
    orders {
        serial id PK
        integer session_id FK
        integer menu_item_id FK
        text device_id
        text participant_name
        integer quantity
        decimal unit_price
        decimal total_price
        text special_instructions
        enum status "pending|confirmed|preparing|ready|served|cancelled"
        timestamp ordered_at
        timestamp updated_at
    }
    
    menu_categories {
        serial id PK
        integer restaurant_id FK
        text name
        text description
        integer display_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    menu_items {
        serial id PK
        integer category_id FK
        text name
        text description
        decimal price
        text image
        boolean is_available
        integer display_order
        jsonb dietary_info
        timestamp created_at
        timestamp updated_at
    }
    
    order_items {
        serial id PK
        integer order_id FK
        integer menu_item_id FK
        integer quantity
        decimal unit_price
        decimal total_price
        text special_instructions
    }
```