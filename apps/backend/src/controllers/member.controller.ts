import type { Request, Response, NextFunction } from "express";
import { memberService } from "../services/member.service";
import { memberRepository } from "../repositories/member.repository";
import type { Permissions, PermissionKey } from "@menugo/dto";

class MemberController {
  async getMyMembership(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const restaurantId = Number(req.params.restaurantId);

      const member = await memberRepository.findByUserAndRestaurant(
        userId,
        restaurantId,
      );
      if (!member) {
        return res
          .status(403)
          .json({ success: false, message: "You are not a member of this restaurant" });
      }

      const roles = await memberRepository.getMemberRoles(userId, restaurantId);

      const isOwner = roles.some((r) => r.roleName === "owner");

      // Merge permissions from all roles
      const mergedPermissions: Permissions = {};
      for (const role of roles) {
        const perms = (role.permissions || {}) as Permissions;
        for (const [key, value] of Object.entries(perms)) {
          if (value) {
            mergedPermissions[key as PermissionKey] = true;
          }
        }
      }

      return res.json({
        success: true,
        data: {
          id: member.id,
          isOwner,
          roles,
          permissions: mergedPermissions,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const members = await memberService.getMembers(restaurantId);
      return res.json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const inviterId = req.user!.id;
      const { email, roleIds } = req.body;

      if (!email || typeof email !== "string") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email" });
      }
      if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid roleIds" });
      }

      const invitation = await memberService.inviteMember(
        restaurantId,
        inviterId,
        {
          email,
          roleIds,
        },
      );
      return res.status(201).json({ success: true, data: invitation });
    } catch (error) {
      next(error);
    }
  }

  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      if (!token || typeof token !== "string") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid token" });
      }

      const result = await memberService.acceptInvitation(token, userId);
      return res.json({
        success: true,
        data: result,
        message: "Invitation accepted",
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      if (!token || typeof token !== "string") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid token" });
      }

      const result = await memberService.rejectInvitation(token, userId);
      return res.json({
        success: true,
        data: result,
        message: "Invitation rejected",
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const memberId = Number(req.params.memberId);

      if (!memberId || isNaN(memberId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid member ID" });
      }

      await memberService.removeMember(memberId, restaurantId);
      return res.json({ success: true, message: "Member removed" });
    } catch (error) {
      next(error);
    }
  }

  async getMyInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.user!.email;
      const invitations = await memberService.getMyInvitations(email);
      return res.json({ success: true, data: invitations });
    } catch (error) {
      next(error);
    }
  }

  async getInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const invitations = await memberService.getInvitations(restaurantId);
      return res.json({ success: true, data: invitations });
    } catch (error) {
      next(error);
    }
  }
}

export const memberController = new MemberController();
