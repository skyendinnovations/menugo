import { Router } from "express";
import { memberController } from "../controllers/member.controller";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requirePermission("manage_members"),
  memberController.getMembers.bind(memberController)
);

router.post(
  "/invite",
  requirePermission("manage_members"),
  memberController.inviteMember.bind(memberController)
);

router.delete(
  "/:memberId",
  requirePermission("manage_members"),
  memberController.removeMember.bind(memberController)
);

router.get(
  "/invitations",
  requirePermission("manage_members"),
  memberController.getInvitations.bind(memberController)
);

export default router;
