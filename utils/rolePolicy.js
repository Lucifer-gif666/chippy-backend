export const ROLE_POLICY = {
    super_admin: {
      canCreate: ["admin", "maintenance", "staff"],
      canEdit: ["admin", "maintenance", "staff"],
      protected: ["super_admin"],
    },
  
    admin: {
      canCreate: ["maintenance", "staff"],
      canEdit: ["maintenance", "staff"],
      protected: ["super_admin", "admin"],
    },
  };
  