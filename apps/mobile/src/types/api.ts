export interface TeamsListResponse {
  status: 'OK';
  teams: { id: number; teamName: string }[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface TeamDetailResponse {
  status: 'OK';
  team: {
    id: number;
    teamName: string;
    teamCode: string;
    memberCount: number;
    adminId: number;
    maxGrade: number;
  };
}

export interface RideListResponse {
  status: 'OK';
  rides: {
    id: number;
    date: string;
    destination: string;
    meetingPlace?: string | null;
    isAssignmentComplete?: boolean;
  }[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface CreateRideResponse {
  status: 'OK';
  message: string;
  id: number;
}

export interface RideDetailResponse {
  status: 'OK';
  ride: {
    id: number;
    date: string;
    destination: string;
    meetingPlace?: string | null;
    deadline?: string | null;
    separateDirections?: boolean;
    teamName?: string;
    pin?: string | null;
    drivers: {
      id: number;
      type: string;
      direction: string;
      availabilityDriverId: number;
      availabilityDriver: {
        guardian: { id: number; name: string };
        seats: number;
        comment: string | null;
      };
      rideAssignments: {
        id: number;
        child: { id: number; name: string; currentGrade: number | null };
      }[];
      escorts: {
        id: number;
        direction: string;
        availabilityDriverId: number;
        availabilityDriver: {
          guardian: { id: number; name: string };
          comment: string | null;
        };
        rideAssignments: {
          id: number;
          child: { id: number; name: string; currentGrade: number | null };
        }[];
      }[];
    }[];
    availabilityDrivers: {
      id: number;
      type: string;
      direction: string;
      seats: number;
      availability: boolean;
      comment: string | null;
      guardian: { id: number; name: string };
    }[];
    children: {
      id: number;
      name: string;
      grade?: number | null;
      gradeYear?: number | null;
      currentGrade: number | null;
      memberId?: number;
    }[];
    childAvailabilities: {
      childId: number;
      availability: boolean;
      selfDriving: boolean;
    }[];
  };
}
