import React from 'react';
import type { VersionData } from '../../shared/types/ItemTypes';
import { TbUserCircle } from 'react-icons/tb';

interface ComparisonHeaderProps {
  isDualMode: boolean;
  compData: {
    leftVersion?: VersionData;
    rightVersion?: VersionData | null;
  } | null;
}

const UserInfo: React.FC<{
  userName?: string | null;
  userPhoto?: string | null;
}> = ({ userName, userPhoto }) => {
  if (!userName) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Unknown</span>
        <TbUserCircle className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-700 font-medium">{userName}</span>
      {userPhoto ? (
        <img
          src={userPhoto}
          alt={userName}
          className="w-6 h-6 rounded-full object-cover border border-slate-300"
        />
      ) : (
        <TbUserCircle className="w-6 h-6 text-slate-400" />
      )}
    </div>
  );
};

const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({
  isDualMode,
  compData,
}) => {
  if (!compData) return null;

  return (
    <div className="p-2.5 border-b-2 bg-slate-100 border-slate-200 rounded-t-xl">
      {isDualMode ? (
        /* Dual Mode Header */
        <div className="rounded-lg p-2">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex flex-col items-center gap-1.5">
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                v{compData.leftVersion?.version_number}
              </span>
              <UserInfo
                userName={compData.leftVersion?.user_name}
                userPhoto={compData.leftVersion?.user_photo}
              />
            </div>
            <span className="text-slate-400 mt-4">vs</span>
            <div className="flex flex-col items-center gap-1.5">
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                v{compData.rightVersion?.version_number}
              </span>
              <UserInfo
                userName={compData.rightVersion?.user_name}
                userPhoto={compData.rightVersion?.user_photo}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Single Mode Header */
        <div className="rounded-lg p-2">
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`text-xs px-2 py-1 rounded ${
                compData.leftVersion?.action_type === 'INSERT'
                  ? 'bg-green-100 text-green-700'
                  : compData.leftVersion?.action_type === 'UPDATE'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {compData.leftVersion?.action_type}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <UserInfo
                userName={compData.leftVersion?.user_name}
                userPhoto={compData.leftVersion?.user_photo}
              />
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                v{compData.leftVersion?.version_number}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonHeader;
