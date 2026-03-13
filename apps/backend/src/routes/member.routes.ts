import { Router } from "express";
import { memberController } from "../controllers/member.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { requireSubscription } from "../middlewares/subscription.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  memberParams,
  memberIdParams,
  memberUserIdParams,
  inviteMemberBody,
  updateMemberRolesBody,
} from "../validations";

const router = Router({ mergeParams: true });

// /me is NOT gated — all tiers can check own membership
router.get(
  "/me",
  validate({ params: memberParams }),
  memberController.getMyMembership.bind(memberController),
);

router.get(
  "/",
  validate({ params: memberParams }),
  requireSubscription("professional"),
  requirePermission("manage_members"),
  memberController.getMembers.bind(memberController),
);

router.post(
  "/invite",
  validate({ params: memberParams, body: inviteMemberBody }),
  requireSubscription("professional"),
  requirePermission("manage_members"),
  memberController.inviteMember.bind(memberController),
);

router.delete(
  "/:memberId",
  validate({ params: memberIdParams }),
  requireSubscription("professional"),
  requirePermission("manage_members"),
  memberController.removeMember.bind(memberController),
);

router.put(
  "/:userId/roles",
  validate({ params: memberUserIdParams, body: updateMemberRolesBody }),
  requireSubscription("professional"),
  requirePermission("manage_members"),
  memberController.updateMemberRoles.bind(memberController),
);

router.get(
  "/invitations",
  validate({ params: memberParams }),
  requireSubscription("professional"),
  requirePermission("manage_members"),
  memberController.getInvitations.bind(memberController),
);

export default router;
