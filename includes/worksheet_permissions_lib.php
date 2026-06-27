<?php

declare(strict_types=1);

/**
 * 工作紙相關權限輔助（設計、派發、評分回饋、學生呈交）
 */

function worksheet_user_can_design(): bool
{
    return user_has_permission('worksheet.manage_any')
        || user_has_permission('worksheet.manage_own');
}

function worksheet_user_can_assign(): bool
{
    return user_has_permission('worksheet.assign_own')
        || user_has_permission('class.manage_any');
}

function worksheet_user_can_grade(): bool
{
    return user_has_permission('worksheet.grade_own')
        || user_has_permission('class.manage_any');
}

function worksheet_user_can_submit(): bool
{
    return user_has_permission('worksheet.submit_own');
}
